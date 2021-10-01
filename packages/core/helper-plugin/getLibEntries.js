const fs = require('fs-extra');
const path = require('path');

// Allows to create distinct bundles in the dist folder
// for people wanting to import only specific components such as
// import Button from '@strapi/parts/Button
const excludedFolders = ['hooks', 'icons', 'index.js', 'old', 'providers', 'templates', 'utils'];
const folders = fs
  .readdirSync(path.resolve(__dirname, 'lib', 'src'))
  .filter(folderName => !excludedFolders.includes(folderName));

const getFolderEntries = folderName => {
  const entries = fs.readdirSync(path.resolve(__dirname, 'lib', 'src', folderName));

  return entries.reduce((acc, current) => {
    acc[current] = path.resolve(__dirname, 'lib', 'src', folderName, current);

    return acc;
  }, {});
};
const entries = folders.reduce(
  (acc, folderName) => {
    const folderEntries = getFolderEntries(folderName);

    return { ...acc, ...folderEntries };
  },
  { index: path.resolve(__dirname, 'lib', 'src') }
);

module.exports = entries;
