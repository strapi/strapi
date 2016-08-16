'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const fs = require('fs-extra');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * Runs after this generator has finished
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  process.chdir(scope.rootPath);

  // Copy the default files.
  fs.copySync(path.resolve(__dirname, '..', 'files'), path.resolve(scope.rootPath));

  // Log an info.
  logger.warn('Installing dependencies... It might take a few seconds.');

  // Create copies to all necessary node modules
  // in the `node_modules` directory.
  const srcDependencyPath = path.resolve(scope.strapiRoot, 'node_modules');
  const destDependencyPath = path.resolve(scope.rootPath, 'node_modules');
  fs.copy(srcDependencyPath, destDependencyPath, function (copyLinkErr) {
    if (copyLinkErr) {
      return cb(copyLinkErr);
    }

    logger.info('Your new application `' + scope.name + '` is ready at `' + scope.rootPath + '`.');
    return cb();
  });
};
