'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { nameToSlug } = require('strapi-utils');

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

  // Format `id`.
  const name = scope.name || nameToSlug(scope.id);

  // Plugin info.
  _.defaults(scope, {
    name,
    author: scope.author || 'A Strapi developer',
    email: scope.email || '',
    year: new Date().getFullYear(),
    license: 'MIT',
  });

  // Take another pass to take advantage of the defaults absorbed in previous passes.
  _.defaults(scope, {
    filename: `${name}.js`,
    filePath: './plugins',
  });

  const pluginDir = path.resolve(scope.rootPath, 'plugins');
  fs.ensureDirSync(pluginDir);

  // Copy the admin files.
  fs.copySync(path.resolve(__dirname, '..', 'files'), path.resolve(pluginDir, name));

  // Trigger callback with no error to proceed.
  return cb.success();
};
