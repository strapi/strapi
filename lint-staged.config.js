'use strict';

const path = require('path');
const fs = require('fs');
const findUp = require('find-up');

const includes = ['packages', '.github'];

const root = path.resolve(__dirname);

function extractPackageName(pkgJsonPath) {
  return JSON.parse(fs.readFileSync(pkgJsonPath).toString()).name;
}

function getLintCommand(files) {
  const affectedFolders = new Set();

  for (const file of files) {
    const r = findUp.sync('package.json', { cwd: file });
    const relPath = path.relative(root, r);

    if (includes.some((incl) => relPath.startsWith(incl))) {
      affectedFolders.add(r);
    }
  }

  const affectedPackages = [...affectedFolders].map(extractPackageName);

  if (affectedPackages.length === 0) {
    return null;
  }
  return `nx run-many -t lint -p ${affectedPackages.join()}`;
}

function getCodeCommands(files) {
  const lintCmd = getLintCommand(files);

  const prettierCmd = `prettier --write ${files.join(' ')}`;

  if (lintCmd) {
    return [lintCmd, prettierCmd];
  }

  return [prettierCmd];
}

module.exports = {
  '*.{js,ts}': getCodeCommands,
  '*.{md,css,scss,yaml,yml}': ['prettier --write'],
};
