/* eslint-disable node/no-extraneous-require */
'use strict';

const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { kebabCase } = require('lodash');
const FilesContentSearch = require('../utils/search-files-content');
const { readAllTranslationFiles, writeAllTranslationFiles } = require('../utils/translation-files');
const { findDuplicatedTranslations } = require('./find-duplicated-translation');

const fcs = new FilesContentSearch(
  [path.join(__dirname, '../../../')],
  ['**/*.js'],
  ['**/node_modules/**', '**/cache/**', '**/build/**']
);

const mapDuplicates = async (duplicatesObject, fn) => {
  Object.entries(duplicatesObject).forEach(([value, pkgs]) => fn(value, pkgs));
};

const mapDuplicateValues = async (pkgs, fn) => {
  Object.entries(pkgs).forEach(([packageName, keys]) => {
    keys.forEach(key => fn(key, packageName));
  });
};

const promptShouldMerge = async () => {
  return (
    await inquirer.prompt({
      type: 'confirm',
      message: 'Should merge?',
      name: 'shouldMerge',
      default: false,
    })
  ).shouldMerge;
};

const promptTargetKey = async valueGroup => {
  return (
    await inquirer.prompt({
      type: 'input',
      name: 'targetKey',
      message: 'Target key name:',
      default: `global.${kebabCase(valueGroup[0].value)}`,
    })
  ).targetKey;
};

const printToMerge = valueGroup => {
  console.log(`Value: "${chalk.yellow(valueGroup[0].value)}"`);

  console.table(
    valueGroup.map(keyGroup => ({
      key: keyGroup.key,
      package: keyGroup.packageName,
      usageCount: keyGroup.resultsCount,
    }))
  );
};

const applyPackageScope = (packageName, searchResults) => {
  return searchResults.filter(
    result => packageName === 'core/admin' || result.path.includes(packageName)
  );
};

// Filters out duplicated translations that are not in use
const getValuesToMerge = keyUsage =>
  keyUsage
    .map(value => value.dups.filter(dup => dup.resultsCount > 0))
    .filter(value => value.length > 1);

// Returns an array of duplicated translations that are in use in the codebase
// (found in at least one .js files)
const getKeysUsage = duplicatesObject => {
  const keyUsage = [];

  mapDuplicates(duplicatesObject, (value, pkgs) => {
    const dups = [];

    mapDuplicateValues(pkgs, (key, packageName) => {
      const searchResults = applyPackageScope(packageName, [
        ...fcs.searchString(`id: '${key}'`),
        ...fcs.searchString(`id: getTrad('${key}')`),
      ]);
      const resultsCount = searchResults.reduce((acc, cur) => cur.matches.length + acc, 0);

      dups.push({
        key,
        value,
        packageName,
        resultsCount,
        replaceAll: replaceValue =>
          searchResults.forEach(result => result.replaceAll(replaceValue)),
      });
    });

    keyUsage.push({ value, dups });
  });

  return keyUsage;
};

// Handles the merging in translation files
// Removes duplicated translations + creates a new shared key in the core/admin en.json file
const updateTranslationFiles = (keyGroup, targetKey) => {
  const translationFiles = {};
  readAllTranslationFiles().forEach(file => (translationFiles[file.packageName] = file));

  if (translationFiles[keyGroup.packageName].fileContent[keyGroup.key] === keyGroup.value) {
    delete translationFiles[keyGroup.packageName].fileContent[keyGroup.key];
  }
  translationFiles['core/admin'].fileContent[targetKey] = keyGroup.value;

  writeAllTranslationFiles(Object.values(translationFiles));
};

// Displays and prompt for every detected duplications
// Triggers the merge if necessary
const merge = async valuesToMerge => {
  let current = 1;
  let mergedCount = 0;

  for (let valueGroup of valuesToMerge) {
    // Display
    console.clear();
    console.log(`${current}/${valuesToMerge.length}`);
    printToMerge(valueGroup);

    // Prompt and merge
    if (await promptShouldMerge()) {
      const targetKey = await promptTargetKey(valueGroup);
      valueGroup.forEach(keyGroup => {
        updateTranslationFiles(keyGroup, targetKey);
        keyGroup.replaceAll(`id: '${targetKey}'`);
        mergedCount++;
      });
    }
    current++;
  }

  console.log(`Merged ${mergedCount} keys`);
};

(async () => {
  await fcs.loadFiles();

  const duplicates = findDuplicatedTranslations();
  const keyUsage = getKeysUsage(duplicates);
  const valuesToMerge = getValuesToMerge(keyUsage);

  await merge(valuesToMerge);
})();
