#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Local Strapi dependencies.
const packageJSON = require('../package.json');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * `$ strapi new`
 *
 * Generate a new Strapi application.
 */

module.exports = function (name, cliArguments) {
  logger.info('Creating your application... It might take a few seconds.');

  const developerMode = cliArguments.dev !== undefined;

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    generatorType: 'new',
    name,
    strapiPackageJSON: packageJSON,
    developerMode
  };

  // Return the scope and the response (`error` or `success`).
  return generate(scope, {

    // Log and exit the REPL in case there is an error
    // while we were trying to generate the new app.
    error: function returnError(err) {
      logger.error(err);
      process.exit(1);
    }
  });
};
