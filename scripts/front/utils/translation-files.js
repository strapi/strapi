'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PACKAGES_DIR_PATH = 'packages/';
const TRANSLATION_FILE_PATH = '/admin/src/translations/en.json';

const getPackageNameFromPath = filePath => {
  return filePath.replace(PACKAGES_DIR_PATH, '').replace(TRANSLATION_FILE_PATH, '');
};

const readTranslationFile = filePath => ({
  filePath,
  packageName: getPackageNameFromPath(filePath),
  fileContent: JSON.parse(fs.readFileSync(filePath).toString('utf-8')),
});

const writeTranslationFile = file => {
  fs.writeFileSync(file.filePath, `${JSON.stringify(file.fileContent, null, 2)}\n`);
};

const readAllTranslationFiles = () => {
  const translationFilesPaths = [
    ...glob.sync(path.join(PACKAGES_DIR_PATH, 'core/*/', TRANSLATION_FILE_PATH)),
    ...glob.sync(path.join(PACKAGES_DIR_PATH, 'plugins/*/', TRANSLATION_FILE_PATH)),
  ];

  return translationFilesPaths.map(readTranslationFile);
};

const writeAllTranslationFiles = files => {
  files.forEach(writeTranslationFile);
};

module.exports = {
  readTranslationFile,
  writeTranslationFile,
  readAllTranslationFiles,
  writeAllTranslationFiles,
};
