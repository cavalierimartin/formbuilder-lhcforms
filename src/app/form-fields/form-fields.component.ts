/**
 * Handles editing of form level fields.
 */
import {
  Component,
  Input,
  Output,
  EventEmitter, OnChanges, AfterViewInit, SimpleChanges, ViewChild
} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {FetchService} from '../services/fetch.service';
import {AutoCompleteResult} from '../lib/widgets/auto-complete/auto-complete.component';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {FormService} from '../services/form.service';
import fhir from 'fhir/r4';
import {Util} from '../lib/util';
import {ArrayProperty, FormComponent, FormProperty} from '@lhncbc/ngx-schema-form';
import {ExtensionsService} from '../services/extensions.service';
import {PropertyGroup} from '@lhncbc/ngx-schema-form/lib/model';

@Component({
  selector: 'lfb-form-fields',
  template: `
    <div class="card-body content">
      <div>
        <h4 class="ms-2">Form level attributes</h4>
        <p class="ms-4">Enter basic information about the form.</p>
        <hr/>
        <div class="container">
          <sf-form #ngxForm [schema]="qlSchema"
                   [model]="questionnaire"
                   (onChange)="valueChanged($event)"
                   (modelReset)="onFormFieldsLoaded($event)"
                   [validators]="validators"
          ></sf-form>
        </div>
        <hr/>
        <div class="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
            <button type="button" class="btn btn-sm btn-primary mt-4 me-2 ms-auto" (click)="goToItemEditor()">{{ questionsButtonLabel }}</button>
        </div>
      </div>
    </div>
  `,
  providers: [ExtensionsService],
  styles: [`
    .content {
      padding: 0.5rem;
    }
  `]
})
export class FormFieldsComponent implements OnChanges, AfterViewInit {

  @ViewChild('ngxForm', {static: false, read: FormComponent}) ngxForm!: FormComponent;
  @Input()
  questionsButtonLabel = 'Create questions';
  @Input()
  questionnaire: fhir.Questionnaire;
  qlSchema: any = {properties: {}}; // Combines questionnaire schema with layout schema.
  notHidden = true;
  acResult: AutoCompleteResult = null;

  objectUrl: any;

  /**
   * Use validators to set up extensions service.
   */
  validators = {
    '/extension': (value, arrayProperty: ArrayProperty, rootProperty: PropertyGroup) => {
      const formPropertyChanged = arrayProperty !== this.extensionsService.extensionsProp;
      if(formPropertyChanged) {
        this.extensionsService.setExtensions(arrayProperty);
      }
      return null;
    }
  };

  @Output()
  state = new EventEmitter<string>();
  @Output()
  questionnaireChange = new EventEmitter<fhir.Questionnaire>();
  loading = false;
  formValue: fhir.Questionnaire;
  constructor(
    private http: HttpClient,
    private dataSrv: FetchService,
    private modal: NgbModal,
    private formService: FormService,
    private extensionsService: ExtensionsService
  ) {
    this.qlSchema = this.formService.getFormLevelSchema();
  }

  ngAfterViewInit() {
    this.adjustRootFormProperty();
  }

  ngOnChanges(changes: SimpleChanges) {
    if(changes.questionnaire) {
      this.loading = true;
    }
  }

  adjustRootFormProperty(): boolean {
    let ret = false;
    const rootProperty = this.ngxForm?.rootProperty;
    // Emit the value after any adjustments.
    // Set '__$codeYesNo' to true, when 'code' is present. The default is false.
    if(!Util.isEmpty(rootProperty?.searchProperty('/code').value)) {
      // Loading is done. Change of value should emit the value in valueChanged().
      rootProperty?.searchProperty('/__$codeYesNo').setValue(true, false);
      ret = true;
    }
    return ret;
  }

  onFormFieldsLoaded(event) {
    this.loading = false;
    this.formValue = event.value;
    if(!this.adjustRootFormProperty()) {
      this.questionnaireChange.emit(Util.convertToQuestionnaireJSON(event.value));
    }
  }
  /**
   * Send message to base page to switch the view.
   */
  setGuidingStep(step: string) {
    this.formService.setGuidingStep(step);
    this.formService.autoSave('state', step); // Record change of state.
  }

  /**
   * Emit the change event.
   */
  valueChanged(event) {
    if(!this.loading) {
      this.questionnaireChange.emit(Util.convertToQuestionnaireJSON(event.value));
    }
  }


  /**
   * Json formatting
   * @param json - JSON object
   */
  stringify(json): string {
    return JSON.stringify(json, null, 2);
  }


  /**
   * TODO
   */
  allFields() {
  }


  /**
   * Button handler for edit questions
   */
  goToItemEditor(): void {
    this.setGuidingStep('item-editor');
  }
}
