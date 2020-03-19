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
    return cb.invalid(
      'Usage: `$ strapi generate:service serviceName --api apiName --plugin pluginName`'
    );
  }

  // Format `id`.
  const name = scope.name || _.trim(_.camelCase(scope.id));

  // `scope.args` are the raw command line arguments.
  _.defaults(scope, {
    name,
    api: scope.args.api || scope.id,
  });

  // Determine default values based on the available scope.
  _.defaults(scope, {
    globalID: _.upperFirst(name),
    ext: '.js',
  });

  // Determine the destination path.
  let filePath;
  if (scope.args.api) {
    filePath = `./api/${scope.args.api}/services`;
  } else if (scope.args.plugin) {
    filePath = `./plugins/${scope.args.plugin}/services`;
  } else {
    filePath = `./api/${name}/services`;
  }

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    rootPath: scope.rootPath,
    filePath,
    filename: scope.globalID + scope.ext,
  });

  // Trigger callback with no error to proceed.
  return cb();
};
