'use strict';

const chalk = require('chalk');
const { merge } = require('lodash/fp');
const { readAllTranslationFiles } = require('../utils/translation-files');
const allowedKeys = require('./allowed-keys');

const printResults = results => {
  let valuesCount = 0;
  let keysCount = 0;

  Object.entries(results).forEach(([value, pkgs]) => {
    Object.entries(pkgs).forEach(([packageName, keys]) => {
      keys.forEach(key => {
        console.log(`"${chalk.yellow(value)}" ${packageName} ${chalk.blue(key)}`);
        keysCount++;
      });
    });
    valuesCount++;
    console.log();
  });

  console.log(`${valuesCount} duplicated values`);
  console.log(`${keysCount} keys can be merged`);
};

const getDuplicatesObject = (prevDups = {}, { f1Key, f2Keys, f1PackageName, f2PackageName }) => {
  const f1PackagePrevDups = prevDups[f1PackageName] || [];
  const f2PackagePrevDups = prevDups[f2PackageName] || [];
  const duplicates = {};

  // Merge and spread duplicate keys array to sets to remove duplicates
  duplicates[f1PackageName] = new Set([...f1PackagePrevDups, f1Key]);
  duplicates[f2PackageName] = new Set([...f2PackagePrevDups, ...f2Keys]);

  return duplicates;
};

const findDuplicates = (file1, file2, { sameFile } = { sameFile: false }) => {
  const dupValues = {};

  // Find in file2 duplicates of every file1 value
  // Format a duplicate object and add it to the dupValues object with translation value as key
  Object.entries(file1.fileContent)
    .filter(([f1Key]) => !allowedKeys.includes(f1Key))
    .forEach(([f1Key, f1Value]) => {
      // Match translations with the same value
      // Skip translations with identical key in a same file (avoid matching itself)
      // Get an array of keys
      const f2Keys = Object.entries(file2.fileContent)
        .filter(([f2Key]) => !allowedKeys.includes(f2Key))
        .filter(([, f2Value]) => f2Value === f1Value)
        .filter(([f2Key]) => !sameFile || f1Key !== f2Key)
        .map(([f2Key]) => f2Key);

      // Add a duplicate value to dupValues if duplicates have been found
      if (f2Keys.length > 0) {
        dupValues[f1Value] = getDuplicatesObject(dupValues[f1Value], {
          f1Key,
          f2Keys,
          f1PackageName: file1.packageName,
          f2PackageName: file2.packageName,
        });
      }
    });

  return dupValues;
};

const findDuplicatedTranslations = () => {
  const files = readAllTranslationFiles();

  // Separate core/admin file from plugin files
  const [coreFile] = files.splice(
    files.findIndex(file => file.packageName === 'core/admin'),
    1
  );
  const pluginFiles = files;

  // Find duplicates inside every file separately
  const coreAdminDuplicates = findDuplicates(coreFile, coreFile, { sameFile: true });
  let crossPackagesDuplicates = { ...coreAdminDuplicates };
  pluginFiles.forEach(pluginFile => {
    crossPackagesDuplicates = merge(
      crossPackagesDuplicates,
      findDuplicates(pluginFile, pluginFile, { sameFile: true })
    );
  });

  // Find duplicates between core/admin and every plugin file
  // Merge the results with core/admin duplicates to avoid showing the same key twice
  // (in case core/admin contains duplicate values that also exists in a plugin)
  pluginFiles.forEach(file => {
    crossPackagesDuplicates = merge(crossPackagesDuplicates, findDuplicates(coreFile, file));
  });

  return crossPackagesDuplicates;
};

module.exports = { findDuplicatedTranslations, printResults };
