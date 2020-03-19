'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

/* eslint-disable prefer-template */
module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.id) {
    return cb.invalid('Usage: `$ strapi generate:policy policyName --api apiName --plugin pluginName`');
  }

  let filePath;
  if (scope.args.api) {
    filePath = `./api/${scope.args.api}/config/policies`;
  } else if (scope.args.plugin) {
    filePath = `./plugins/${scope.args.plugin}/config/policies`;
  } else {
    filePath = './config/policies';
  }

  // Determine default values based on the available scope.
  _.defaults(scope, {
    ext: '.js'
  });

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    filePath,
    filename: scope.id + scope.ext
  });

  // Humanize output.
  _.defaults(scope, {
    humanizeId: scope.id,
    humanizedPath: '`' + scope.filePath + '`'
  });

  // Trigger callback with no error to proceed.
  return cb();
};
