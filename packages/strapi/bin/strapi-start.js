#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Local Strapi dependencies.
const isLocalStrapiValid = require('../lib/private/isLocalStrapiValid');
const packageJSON = require('../package.json');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * `$ strapi start`
 *
 * Expose method which starts the appropriate instance of Strapi
 * (fire up the application in our working directory).
 */

module.exports = function () {

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiPackageJSON: packageJSON
  };

  // Use the app's local `strapi` in `node_modules` if it's existant and valid.
  const localStrapiPath = path.resolve(scope.rootPath, 'node_modules', 'strapi');

  if (isLocalStrapiValid(localStrapiPath, scope.rootPath)) {
    return require(localStrapiPath).start(scope, afterwards);
  }

  // Otherwise, if no workable local `strapi` module exists,
  // run the application using the currently running version
  // of `strapi`. This is probably always the global install.
  return require('../lib/')().start(scope, afterwards);

  function afterwards(err, strapi) {
    if (err) {
      const message = err.stack ? err.stack : err;
      logger.error(message);
      strapi ? strapi.stop() : process.exit(1);
    }
  }
};
