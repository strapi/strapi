'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.args[0]) {
    return cb.invalid('Usage: `$ strapi generate:model modelName apiName`');
  }

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    id: scope.args[0],
    api: scope.args[1],
    environment: process.NODE_ENV || 'development'
  });

  // Determine default values based on the available scope.
  _.defaults(scope, {
    globalID: _.capitalize(scope.id),
    ext: '.js'
  });

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    filename: scope.globalID + scope.ext,
    filenameSettings: scope.globalID + '.settings.json'
  });

  // Humanize output.
  _.defaults(scope, {
    humanizeId: scope.args[0],
    humanizedPath: '`./api/' + scope.api + '/models`'
  });

  // Get default connection
  try {
    scope.connection = JSON.parse(fs.readFileSync(path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'databases.json'))).defaultConnection || '';
  } catch (err) {
    return cb.invalid(err);
  }

  // Trigger callback with no error to proceed.
  return cb();
};
