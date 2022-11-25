'use strict';

const { join, resolve, sep, posix } = require('path');
const fs = require('fs-extra');
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');

// Only for dev environement
const getPluginsPath = () => {
  const rootPath = resolve(__dirname, '..', join('..', '..', '..', 'packages'));
  /**
   * So `glob` only supports '/' as a path separator, so we need to replace
   * the path separator for the current OS with '/'. e.g. on windows it's `\`.
   *
   * see https://github.com/isaacs/node-glob/#windows for more information
   *
   * and see https://github.com/isaacs/node-glob/issues/467#issuecomment-1114240501 for the recommended fix.
   */
  const corePath = join(rootPath, 'core', '*').split(sep).join(posix.sep);
  const pluginsPath = join(rootPath, 'plugins', '*').split(sep).join(posix.sep);
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
