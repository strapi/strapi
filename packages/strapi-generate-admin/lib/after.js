'use strict';

/**
 * Module dependencies
 */

const { exec } = require('child_process');
const path = require('path');
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
  fs.copySync(path.resolve(__dirname, '..', 'files'), path.resolve(scope.rootPath, 'admin'));

  if (scope.developerMode) {
    return cb();
  }

  // Install back-end admin `node_modules`.
  const cmd = packageManager.isStrapiInstalledWithNPM() ? 'npm install --production --ignore-scripts' : 'yarn install --production --ignore-scripts';
  exec(cmd, {
    cwd: path.resolve(scope.rootPath, 'admin')
  }, (err) => {
    if (err) {
      return cb(err);
    }

    cb();
  });
};
