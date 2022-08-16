'use strict';

const { join, resolve } = require('path');
const fs = require('fs-extra');
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');

// Only for dev environement
const getPluginsPath = () => {
  const rootPath = resolve(__dirname, '..', join('..', '..', '..', 'packages'));
  const corePath = join(rootPath, 'core', '*');
  const pluginsPath = join(rootPath, 'plugins', '*');
  const corePackageDirs = glob.sync(corePath);
  const pluginsPackageDirs = glob.sync(pluginsPath);

  const packageDirs = [...corePackageDirs, ...pluginsPackageDirs].filter((dir) => {
    const isCoreAdmin = dir.includes('packages/core/admin');
    const pathToEntryPoint = join(dir, 'admin', 'src', 'index.js');
    const doesAdminFolderExist = fs.pathExistsSync(pathToEntryPoint);

    return !isCoreAdmin && doesAdminFolderExist;
  });

  return packageDirs.map((dir) => resolve(__dirname, '..', join(dir, 'admin', 'src')));
};

module.exports = getPluginsPath;
