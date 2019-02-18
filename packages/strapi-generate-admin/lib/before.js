'use strict';

const path = require('path');

const _ = require('lodash');
const fs = require('fs-extra');

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */
module.exports = function (scope, cb) {
  if (scope.developerMode) {
    fs.mkdirsSync(path.resolve(scope.rootPath));
    fs.symlinkSync(path.resolve(__dirname, '..', '..', 'strapi-admin'), path.resolve(scope.rootPath, 'admin'), 'junction');
  } else {
    // Copy the admin files.
    fs.copySync(path.resolve(__dirname, '..', '..', 'strapi-admin'), path.resolve(scope.rootPath, 'admin'), {
      // Skip `node_modules` folder.
      filter: (file) => (
        file.indexOf(path.resolve(__dirname, '..', '..', 'strapi-admin', 'node_modules')) === -1 &&
        file.indexOf('package-lock.json') === -1
      )
    });
  }

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    humanizedPath: '`./admin`'
  });

  // Trigger callback with no error to proceed.
  return cb.success();
};
