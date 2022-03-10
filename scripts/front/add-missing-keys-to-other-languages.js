// Add missing keys to non-english languages from `en.json`.
// This script eases the process of translating strapi to other languages.
// Usage:
//   node scripts/front/add-missing-keys-to-other-languages.js [language]
// Example:
//   node scripts/front/add-missing-keys-to-other-languages.js vi
'use strict';

const { join, dirname } = require('path');
const { promisify } = require('util');
const fs = require('fs-extra');
const glob = promisify(require('glob').glob);

const addMissingKeyForSingleFile = async filePath => {
  console.log('Start adding missing keys to', filePath);
  try {
    // Read translation file
    const currentTranslationFileJSON = await fs.readJSON(filePath);
    // Read en.json
    const mainTranslationFile = join(dirname(filePath), 'en.json');
    const mainTranslationFileJSON = await fs.readJSON(mainTranslationFile);
    // Add missing keys from en.json to translation file
    const updatedFile = Object.keys(mainTranslationFileJSON).reduce((acc, current) => {
      if (currentTranslationFileJSON[current]) {
        acc[current] = currentTranslationFileJSON[current];
      } else {
        acc[current] = mainTranslationFileJSON[current];
      }

      return acc;
    }, {});
    await fs.writeJson(filePath, updatedFile, { spaces: 2 });
    console.log('Added missing keys to ', filePath);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
};

const addMissingKeys = async lang => {
  // Get translation files
  const corePackageDirs = await glob('packages/core/*');
  const pluginsPackageDirs = await glob('packages/plugins/*');
  const packageDirs = [...corePackageDirs, ...pluginsPackageDirs];
  const pathToTranslationsFolder = ['admin', 'src', 'translations'];

  const translationFiles = packageDirs
    .filter(dir => {
      return fs.existsSync(join(dir, ...pathToTranslationsFolder, `${lang}.json`));
    })
    .reduce((acc, dir) => {
      return [...acc, join(dir, ...pathToTranslationsFolder, `${lang}.json`)];
    }, []);
  console.log('List of files to add missing keys', translationFiles, '\n');

  // For each file run addMissingKeyForSingleFile
  translationFiles.forEach(addMissingKeyForSingleFile);
};

if (process.argv.length < 3) {
  console.log(
    'Please provide a language.For examples:\nnode scripts/front/add-missing-keys-to-other-languages.js vi'
  );
  process.exit(1);
}
addMissingKeys(process.argv[2]).catch(err => console.error(err));
