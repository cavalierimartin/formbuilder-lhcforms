/**
 * Component to display array of object fields in a table format with field names at the top,
 * add button at the bottom, delete button for each row, label for the table at the left etc.
 *
 * It is optionally controlled by a boolean widget above the table.
 *
 * An optional selection column is provided to select rows with either radio buttons or checkboxes. For example,
 * It could be used as selection of rows for defaults in answer options table.
 * The checkbox selections are captured in an array of boolean values, while index of radio selection is captured
 * in an integer variable.
 */

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import {FormProperty} from '@lhncbc/ngx-schema-form';
import {faPlusCircle} from '@fortawesome/free-solid-svg-icons';
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import {faAngleDown} from '@fortawesome/free-solid-svg-icons';
import {faAngleRight} from '@fortawesome/free-solid-svg-icons';
import {PropertyGroup} from '@lhncbc/ngx-schema-form/lib/model';
import {Util} from '../../util';
import {LfbArrayWidgetComponent} from '../lfb-array-widget/lfb-array-widget.component';
import {Subscription} from 'rxjs';

@Component({
  selector: 'lfb-table',
  templateUrl: './table.component.html', // Use separate files for possible reuse from a derived class
  styleUrls: ['./table.component.css']
})
export class TableComponent extends LfbArrayWidgetComponent implements OnInit, AfterViewInit, DoCheck, OnChanges {

  static seqNum = 0;
  // Icons for buttons.
  faAdd = faPlusCircle;
  faRemove = faTrash;
  faRight = faAngleRight;
  faDown = faAngleDown;

  isCollapsed = false;
  addButtonLabel = 'Add'; // Default label
  noCollapseButton = false;
  noTableLabel = false;
  noHeader = false;
  // Flag to control hiding of add/remove buttons.
  singleItem = false;
  keyField = 'type'; // Key property of the object, based on which some fields could be hidden/shown.
  booleanControlledOption = false;
  booleanControlled = false;
  tableId = 'tableComponent'+TableComponent.seqNum++;

  // Row selection variables. Selections can be checkboxes or radio buttons.
  selectionRadio = -1; // Store array index of the radio button selection.
  selectionCheckbox: boolean [] = []; // Store an array of selected rows. Unselected elements are nulls or false.
  rowSelectionType = null; // 'radio' or 'checkbox'
  rowSelection = false; // If a row selection column is displayed. Default is no column.

  constructor(private elRef: ElementRef, private cdRef: ChangeDetectorRef) {
    super();
  }
  /**
   * Make sure at least one row is present for zero length array?
   */
  ngDoCheck(): void {
    if (this.formProperty.properties.length === 0 && this.booleanControlledOption) {
      this.addItem();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.booleanControlled) {
      this.booleanControlledOption = !Util.isEmpty(this.formProperty.value);
    }
  }


  /**
   * Initialize
   */
  ngOnInit() {
    super.ngOnInit();
    const widget = this.formProperty.schema.widget;
    this.addButtonLabel = widget && widget.addButtonLabel
      ? widget.addButtonLabel : 'Add';

    this.noTableLabel = !!widget.noTableLabel;
    this.noCollapseButton = !!widget.noCollapseButton;
    this.singleItem = !!widget.singleItem;
    this.booleanControlled = !!widget.booleanControlled;
    if(widget.booleanControlled) {
      this.booleanControlledOption = !!widget.booleanControlledOption;
    }

    this.booleanControlledOption = this.booleanControlledOption || !Util.isEmpty(this.formProperty.value);

    if(widget.rowSelection) {
      this.rowSelection = widget.rowSelection;
      this.rowSelectionType = widget.rowSelectionType || 'radio'; // Defaults to radio buttons.
    }
    this.selectionRadio = -1;
    this.selectionCheckbox = [];
  }
  /**
   * Initialize setting up observers.
   */
  ngAfterViewInit() {
    super.ngAfterViewInit();
    const singleItemEnableSource = this.formProperty.schema.widget ?
      this.formProperty.schema.widget.singleItemEnableSource : null;
    const multipleSelectionEnableSource = this.formProperty.schema.widget ?
      this.formProperty.schema.widget.multipleSelectionEnableSource : null;
    // Although intended to be source agnostic, it is mainly intended for 'repeats' field as source.
    // For example, when repeats is false, The initial field is only one row.
    // The requirement is:
    // . When source is false, hide add/remove buttons.
    // . Source if present and is true means show the buttons.
    // . Absence of source condition means the default behavior which is show the buttons.
    let prop = singleItemEnableSource ? this.formProperty.searchProperty(singleItemEnableSource) : null;
    let subscription: Subscription;
    if (prop) {
      subscription = prop.valueChanges.subscribe((newValue) => {
        if (newValue === false) {
          // If already has multiple items in the array, remove all items except first one.
          if (this.formProperty.properties.length > 1) {
            this.formProperty.properties = (this.formProperty.properties as FormProperty[]).slice(0, 1);
            this.formProperty.updateValueAndValidity(false, true);
          }
        }
        this.singleItem = !newValue;
        this.noCollapseButton = this.singleItem;
        if(this.rowSelection) {
          this.rowSelectionType = this.singleItem ? 'radio' : 'checkbox';
        }
        this.cdRef.markForCheck();
      });
      this.subscriptions.push(subscription);
    }

    prop = multipleSelectionEnableSource ? this.formProperty.searchProperty(multipleSelectionEnableSource) : null;
    if (prop) {
      subscription = prop.valueChanges.subscribe((newValue) => {
        if (newValue === false && this.rowSelection) {
          this.rowSelectionType = 'radio';
        }
        else if(newValue && this.rowSelection) {
          this.rowSelectionType = 'checkbox';
        }
        if(newValue === false && this.rowSelection && this.formProperty.properties.length === 1) {
          this.rowSelectionType = 'checkbox';
        }
        this.cdRef.markForCheck();
      });
      this.subscriptions.push(subscription);
    }

    const keyField = this.formProperty.findRoot().schema.widget.keyField;
    if (keyField) {
      this.keyField = keyField;
    }
    // Lookout for any changes to key field
    subscription = this.formProperty.searchProperty(this.keyField).valueChanges.subscribe((newValue) => {
      const showFields = this.getShowFields();
      this.noHeader = showFields.some((f) => f.noHeader);
      this.cdRef.markForCheck();
    });

    this.subscriptions.push(subscription);

    subscription = this.formProperty.valueChanges.subscribe((newValue) => {
      this.booleanControlledOption = this.booleanControlledOption || !Util.isEmpty(newValue);
    });
    this.subscriptions.push(subscription);
  }

  /**
   * Handle booleanControlled event.
   * @param event - Angular event emitted value.
   */
  onBooleanControlledChange(event: boolean) {
    this.booleanControlledOption = event;
  }

  /**
   * Get fields to show.
   */
  getShowFields(): any [] {
    let ret: any [] = [];
    if (this.formProperty.schema.widget && this.formProperty.schema.widget.showFields) {
      const showFields = this.formProperty.schema.widget.showFields;
      ret = showFields.filter((field) => {
        return this.isVisible(field.field);
      });
    }
    return ret;
  }

  /**
   * Check visibility i.e. based on visibleIf of ngx-schema-form
   * @param propertyId - property id
   */
  isVisible(propertyId) {
    let ret = true;
    if (this.formProperty.properties.length > 0) {
      ret = Util.isVisible(this.formProperty.properties[0], propertyId);
    }
    return ret;
  }

  /**
   * Search for formProperty based on '.' delimited property ids.
   *
   * @param parentProperty -
   * @param propertyId -
   */
  getProperty(parentProperty: PropertyGroup, propertyId: string) {
    const path = propertyId.split('.');
    let p = parentProperty;
    for (const id of path) {
      p = p.getProperty(id);
    }
    return p;
  }

  /**
   * Get title of a field, given property id.
   * @param parentProperty -
   * @param propertyId -
   */
  getTitle(parentProperty, propertyId): string {
    const p = this.getProperty(parentProperty, propertyId);
    return p.schema && p.schema.title ? p.schema.title : Util.capitalize(propertyId);
  }


  /**
   * When clicking add button, prevent adding multiple empty rows. Alert the user with a popover message.
   * @param popoverRef - popover reference template.
   */
  addItemWithAlert(popoverRef) {
    const items = this.formProperty.properties as [];
    const lastItem = items.length ? items[items.length - 1] : null;
    if(!lastItem || !Util.isEmpty(lastItem.value)) { // If no lastItem or be not empty.
      this.addItem();
      setTimeout(() => {
        const props = this.formProperty.properties as FormProperty [];
        this.getInputElementInTable(props.length - 1, 0).focus();
      });
    }
    else {
      popoverRef.open();
    }
  }


  /**
   * Get input element in the table.
   * Assumes one input or select element in a single cell.
   *
   * @param row - Row index of the cell
   * @param col - Column index of the cell.
   */
  getInputElementInTable(row, col) {
    return this.elRef.nativeElement.querySelector('tbody')
      .querySelectorAll('tr')[row]
      .querySelectorAll('td')[col]
      .querySelector('input,select');
  }


  /**
   * Get canonical path of the control located in a cell in the table.
   *
   * @param arrayProperties - ArrayProperty of the table
   * @param row - Row index of the cell
   * @param col - Column index of the cell.
   */
  getCanonicalPath(arrayProperties, row, col) {
    return this.getPropertyFromTable(arrayProperties, row, col)?.canonicalPathNotation;
  }


  /**
   * Get form property of the control located in a table cell.
   * @param arrayProperties - ArrayProperty of the table.
   * @param row - Row index of the cell.
   * @param col - Col index of the cell.
   */
  getPropertyFromTable(arrayProperties, row, col): FormProperty {
    let prop = arrayProperties[row];
    const fieldPath = this.getShowFields()[col].field;
    fieldPath.split('.').forEach((field) => {
      prop = prop.getProperty(field);
    });
    return prop;
  }


  /**
   * Remove a given item, i.e. a row in the table.
   *
   * Before calling parent class api to remove the item, we need to do some housekeeping with respect to table's
   * selection (radio/checkbox) indexes.
   *
   * @param formProperty - The row represented by its form property.
   */
  removeItem(formProperty) {
    const props = this.formProperty.properties as FormProperty [];

    const propIndex = props.findIndex((e) => e === formProperty);
    if(propIndex >= 0) {
      if(this.selectionCheckbox.length > 0) {
        this.selectionCheckbox.splice(propIndex, 1);
      }
      if(this.selectionRadio >= 0) {
        if(this.selectionRadio === propIndex) {
          this.selectionRadio = -1; // selected row is deleted. No selected radio button.
        }
        else if (this.selectionRadio > propIndex) {
          this.selectionRadio--;
        }
      }
    }
    super.removeItem(formProperty);
  }


  /**
   * Possible method for handling row selections for radio buttons.
   */
  radioSelection(event) {
  }


  /**
   * Possible method for handling row selections for checkboxes.
   */
  checkboxSelection(event) {
  }
}
