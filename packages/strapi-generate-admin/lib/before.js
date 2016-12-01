'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
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

  // Copy the admin files.
  fs.copySync(path.resolve(__dirname, '..', 'files'), path.resolve(scope.rootPath));

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    humanizedPath: '`./admin`'
  });

  // Trigger callback with no error to proceed.
  return cb.success();
};
