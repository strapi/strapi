'use strict';

const {join,extname} = require('path');
const {promisify} = require('util');
const execa = require('execa');
const fs = require('fs-extra');
const readline = require('node:readline/promises');
const glob = promisify(require('glob').glob);


function searchFilesInDirectory(dir, filter, ext,exludePath) {
  if (!fs.existsSync(dir)) {
    console.log(`Specified directory: ${dir} does not exist`);
    return;
  }

  const files = getFilesInDirectory(dir, ext);

  const foundFiles = [];

  files.forEach(file => {
    const fileContent = fs.readFileSync(file);

    // We want full words, so we use full word boundary in regex.
    const regex = new RegExp('\\b' + filter + '\\b');
    if (regex.test(fileContent) && (!exludePath || !exludePath.test(file))) {
      foundFiles.push(file);
    }
  });
  return foundFiles;
}

// Using recursion, we find every file with the desired extention, even if its deeply nested in subfolders.
function getFilesInDirectory(dir, ext) {
  if (!fs.existsSync(dir)) {
    console.log(`Specified directory: ${dir} does not exist`);
    return;
  }

  let files = [];
  fs.readdirSync(dir).forEach(file => {
    const filePath = join(dir, file);
    const stat = fs.lstatSync(filePath);

    // If we hit a directory, apply our function to that dir. If we hit a file, add it to the array of files.
    if (stat.isDirectory()) {
      const nestedFiles = getFilesInDirectory(filePath, ext);
      files = files.concat(nestedFiles);
    } else {
      if (ext.includes(extname(file))) {
        files.push(filePath);
      }
    }
  });

  return files;
}

async function run() {

  const adminDirectory = join(__dirname, '..', 'packages/core/admin/admin/src/translations/');
  const contentManagerDirectory = join(__dirname, '..', 'packages/core/content-manager/admin/src/translations/');

  let i18nPathDirectory = '';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let pathDirectoryChoice ='';

  do {
     pathDirectoryChoice = await rl.question(`Which translation directory ?\n 1 - ${contentManagerDirectory}\n 2 - ${adminDirectory}\n`);


  }while (!['1','2'].includes(pathDirectoryChoice))
  switch (pathDirectoryChoice) {
    case '1':
      i18nPathDirectory = contentManagerDirectory;
      break;
    case '2':
      i18nPathDirectory = adminDirectory
  }


  let originLanguage = '';
  let originI18nFileExist = false;
  let originTranslations = {};

  let destinationLanguage = '';
  let destinationI18nFileExist = false;
  let destinationTranslations = {};
  let destinationFile = '';


  do {
    originLanguage = await rl.question('What language of origin do you want to translate ? \n');
    const originFile = join(i18nPathDirectory, `${originLanguage.trim()}.json`);
    originI18nFileExist = fs.existsSync(originFile);
    if(originI18nFileExist) {
      originTranslations = JSON.parse(fs.readFileSync(originFile, 'utf8'));
      console.log(`Origin 18n file found for: "${originLanguage}"`);
      console.log(`${Object.keys(originTranslations).length} translations found.`);
    }else{
      console.log(`No i18n file found for: "${originLanguage}"`);
    }

  } while (!originI18nFileExist)

  do {
    destinationLanguage = await rl.question('What language of destination do you want to translate ? \n');
    destinationFile = join(i18nPathDirectory, `${destinationLanguage.trim()}.json`);
    destinationI18nFileExist = fs.existsSync(destinationFile);
    if(destinationI18nFileExist) {
      destinationTranslations = JSON.parse(fs.readFileSync(destinationFile, 'utf8'));
      console.log(`Origin 18n file found for: "${destinationLanguage}"`);
      console.log(`${Object.keys(destinationTranslations).length} translations found.`);
    }else{
      console.log(`No i18n file found for: "${destinationLanguage}"`);
    }

  } while (!destinationI18nFileExist)


  const missingTranslations = Object.keys(originTranslations).filter(key => !destinationTranslations[key]);

  console.log(`${missingTranslations.length} translations are missing in "${destinationLanguage}"`);

  let index = 0;
  let skipped = 0;
  for (const key of missingTranslations) {
    index++;
    const uses = searchFilesInDirectory(join(__dirname, '..','packages'), key, ['.js','.ts','.tsx'],new RegExp('dist'));

    if(uses.length > 0){
      if(skipped > 0){
        console.log(`Skipped ${skipped} translations, because they are not used in the code`);
        skipped = 0;
      }
      const translationMessage = await rl.question(`[${index}/${missingTranslations.length}]What translation for the code ${key}\n "${originTranslations[key]}" \n`);

      if(translationMessage !== ''){
        destinationTranslations[key] = translationMessage;
        //Save the new translation
        fs.writeFileSync(destinationFile, JSON.stringify(destinationTranslations, null, 2));
      }

    }else{
      skipped++;
    }

  }


  rl.close();
}

run().catch((err) => console.error(err));
