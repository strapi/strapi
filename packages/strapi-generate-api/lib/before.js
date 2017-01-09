'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');
const pluralize = require('pluralize');

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.args[0]) {
    return cb.invalid('Usage: `$ strapi generate:api apiName`');
  }

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    id: _.trim(_.deburr(scope.args[0])),
    idPluralized: pluralize.plural(_.trim(_.deburr(scope.args[0]))),
    subId: _.isEmpty(scope.args[1]) ? undefined : _.trim(_.deburr(scope.args[1])),
    subIdPluralized: _.isEmpty(scope.args[1]) ? undefined : pluralize.plural(_.trim(_.deburr(scope.args[1]))),
    environment: process.NODE_ENV || 'development'
  });

  // Determine default values based on the available scope.
  _.defaults(scope, {
    globalID: _.upperFirst(_.camelCase(_.isEmpty(scope.subId) ? scope.id : scope.subId)),
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
    humanizeId: _.camelCase(scope.id).toLowerCase(),
    humanizeSubId: _.isUndefined(scope.subId) ? undefined : _.camelCase(scope.subId).toLowerCase(),
    humanizeIdPluralized: pluralize.plural(_.camelCase(scope.id).toLowerCase()),
    humanizeSubIdPluralized: _.isUndefined(scope.subId) ? undefined : pluralize.plural(_.camelCase(scope.subId).toLowerCase()),
    humanizedPath: '`./api`'
  });

  // Get default connection
  try {
    scope.connection = JSON.parse(fs.readFileSync(path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'databases.json'))).defaultConnection || '';
  } catch (err) {
    return cb.invalid(err);
  }

  // Trigger callback with no error to proceed.
  return cb.success();
};
