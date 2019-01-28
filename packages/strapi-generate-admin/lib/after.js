'use strict';

/**
 * Module dependencies
 */

const path = require('path');
const shell = require('shelljs');
const fs = require('fs-extra');
const { packageManager } = require('strapi-utils'); // eslint-disable-line import/no-unresolved

/**
 * Runs after this generator has finished
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports =  (scope, cb) => {
  // Copy the admin files.
  fs.copySync(path.resolve(__dirname, '..', 'templates', 'gitignore'), path.join(scope.rootPath, 'admin', '.gitignore'));

  if (scope.developerMode) {
    return cb();
  }

  // Install back-end admin `node_modules`.
  const cmd = packageManager.isStrapiInstalledWithNPM() ? 'npm install --production --ignore-scripts' : 'yarn install --production --ignore-scripts';
  shell.exec(cmd, {
    cwd: path.resolve(scope.rootPath, 'admin')
  }, {silent: true}, (code, stdout, stderr) => {
    if (code) {
      return cb(stderr);
    }

    cb();
  });
};
