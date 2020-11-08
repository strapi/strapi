'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const { nameToSlug } = require('strapi-utils');
/* eslint-disable prefer-template */
/**
 * This `before` function is run before generating targets.
 * Validate, configure defaults, get extra dependencies, etc.
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  if (!scope.rootPath || !scope.id) {
    return cb.invalid(
      'Usage: `$ strapi generate:controller controllerName --api apiName --plugin pluginName`'
    );
  }

  // Format `id`.
  const name = scope.name || nameToSlug(scope.id);

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    name,
    api: scope.id,
  });

  // Determine the destination path.
  let filePath;
  if (scope.args.api) {
    filePath = `./api/${scope.args.api}/controllers`;
  } else if (scope.args.plugin) {
    filePath = `./plugins/${scope.args.plugin}/controllers`;
  } else if (scope.args.extend) {
    filePath = `./extensions/${scope.args.extend}/controllers`;
  } else {
    filePath = `./api/${name}/controllers`;
  }

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    filePath,
    filename: `${name}.js`,
  });

  // Trigger callback with no error to proceed.
  return cb();
};
