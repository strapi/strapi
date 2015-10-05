#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const winston = require('winston');

// Local Strapi dependencies.
const strapi = require('../lib/server');
const packageJSON = require('../package.json');

// Logger.
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: 'level'
    })
  ]
});

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

  // Use the current directory as application path.
  const appPath = process.cwd();

  // Use the app's local `strapi` in `node_modules` if it's existant and valid.
  const localStrapiPath = path.resolve(appPath, 'node_modules', 'strapi');
  if (strapi.isLocalStrapiValid(localStrapiPath, appPath)) {
    const localStrapi = require(localStrapiPath);
    localStrapi.start(scope, afterwards);
    return;
  }

  // Otherwise, if no workable local `strapi` module exists,
  // run the application using the currently running version
  // of `strapi`. This is probably always the global install.
  const globalStrapi = strapi();
  globalStrapi.start(scope, afterwards);

  function afterwards(err, strapi) {
    if (err) {
      const message = err.stack ? err.stack : err;
      logger.error(message);
      strapi ? strapi.stop() : process.exit(1);
    }
  }
};
