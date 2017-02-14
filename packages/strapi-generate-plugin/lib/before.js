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

module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.id) {
    return cb.invalid('Usage: `$ strapi generate:plugin pluginName`');
  }

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    id: _.trim(_.deburr(scope.id))
  });

  // Determine default values based on the available scope.
  _.defaults(scope, {
    globalID: _.upperFirst(_.camelCase(scope.id)),
    ext: '.js'
  });


  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    filename: `${scope.globalID}${scope.ext}`
  });


  // Humanize output.
  _.defaults(scope, {
    humanizeId: _.camelCase(scope.id).toLowerCase(),
    humanizedPath: '`./plugins`'
  });

  // Trigger callback with no error to proceed.
  return cb.success();
};
