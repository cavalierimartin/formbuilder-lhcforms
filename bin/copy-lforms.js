/**
 * This script copies lforms build files from LForms website.
 *
 * By default the CTSS url is used to download the files.
 * The version of lforms is hard coded in this script. To upgrade
 * lforms version, change version string below.
 *
 * Optionally to copy files from other websites, an url could be
 * specified as argument to this script.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

let downloadUrl = 'https://clinicaltables.nlm.nih.gov/lforms-versions';

// Change version here to update LForms package.
const version = '34.0.1';

// External scripts could change version?
if(version?.length) {
  downloadUrl = [downloadUrl,  version].join('/');
}

// Optional argument could change download url.
if(process.argv.length > 2) {
  downloadUrl = process.argv[2];
}
console.log(`Downloading from ${downloadUrl}`);

const destinationFolder = path.join(__dirname, '../src/lib/lforms/lib');
const filePathMap = {
  'webcomponent/runtime.js'   : 'elements',
  'webcomponent/runtime.js.map'   : 'elements',
  'webcomponent/polyfills.js'   : 'elements',
  'webcomponent/polyfills.js.map'   : 'elements',
  'webcomponent/main.js'   : 'elements',
  'webcomponent/main.js.map'   : 'elements',
  'webcomponent/styles.css'         : 'elements',
  'fhir/lformsFHIRAll.min.js'       : 'fhir',
  'fhir/lformsFHIRAll.min.js.map'   : 'fhir',
  'webcomponent/assets/lib/zone.min.js': 'elements/assets/lib',
  'webcomponent/down_arrow_gray_10_10.png': 'elements',
  'webcomponent/magnifying_glass.png': 'elements'

}

const appFolder = path.dirname(path.dirname(path.dirname(destinationFolder)));
if(!fs.existsSync(appFolder)) {
  errorExit(null, `${appFolder} directory does not exist. Please make sure to create it before running this script`);
}

Object.keys(filePathMap).map((k) => {
 // Create a map between url to destination file path.
  let url = [downloadUrl, k].join('/');
  let file = [destinationFolder, filePathMap[k], path.basename(k)].join('/');
  return {url, file};
}).forEach((m) => {
  copyFileFromUrl(m.url, m.file);
});


/**
 * Copy a url stream to a file.
 *
 * @param url
 * @param filePath
 */
function copyFileFromUrl(url, filePath) {
  // We checked destinationFolder exists. Make sure sub folders are created.
  const dirName = path.dirname(filePath);
  if(!fs.existsSync(dirName)) {
    console.log(`Creating ${dirName}`);
    try {
      fs.mkdirSync(dirName, {recursive: true});
    }
    catch (e) {
      errorExit(e, `Failed to create ${dirName}!`);
    }
  }

  const file = fs.createWriteStream(filePath, {flags: 'w'});
  file.on('finish', () => {
    console.log(`${filePath} is copied.`);
  });
  file.on('error', (e) => {
    errorExit(e, `Error writing file ${filePath}`);
  });

  const httpReq = downloadUrl.startsWith('https') ? https : http;
  httpReq.get(url, function(response) {
    if(response.statusCode === 200) {
      response.pipe(file);
    }
    else {
      errorExit(null, `${url} returned ${response.statusCode}` )
    }
  }).on('error', (e) => {
    errorExit(e, `Error copying file from ${url}`);
  });
}


/**
 * Exit process with message
 *
 * @param error - error object
 * @param errorMessage - Crafted message
 */
function errorExit(error, errorMessage) {
  console.error(errorMessage);
  console.error(error);
  process.exit(1);
}

