'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const { nameToSlug } = require('strapi-utils');

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
    return cb.invalid(
      'Usage: `$ strapi generate:policy policyName --api apiName --plugin pluginName`'
    );
  }

  // Format `id`.
  const name = scope.name || nameToSlug(scope.id);

  let filePath;
  if (scope.args.api) {
    filePath = `./api/${scope.args.api}/config/policies`;
  } else if (scope.args.plugin) {
    filePath = `./plugins/${scope.args.plugin}/config/policies`;
  } else {
    filePath = './config/policies';
  }

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    name,
    filePath,
    filename: `${name}.js`,
  });

  // Trigger callback with no error to proceed.
  return cb();
};
