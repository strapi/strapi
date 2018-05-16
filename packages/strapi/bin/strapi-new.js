#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Logger.
const logger = require('strapi-utils').logger;

// Local Strapi dependencies.
const packageJSON = require('../package.json');

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

  const dbArguments = ['dbclient', 'dbhost', 'dbport', 'dbname', 'dbusername', 'dbpassword'];
  const matchingDbArguments = _.intersection(_.keys(cliArguments), dbArguments);

  if (matchingDbArguments.length) {
    if (matchingDbArguments.length !== dbArguments.length) {
      logger.warn(`Some database arguments are missing. Required arguments list: ${dbArguments}`);
      return process.exit(1);
    }

    scope.database = {
      settings: {
        client: cliArguments.dbclient,
        host: cliArguments.dbhost,
        port: cliArguments.dbport,
        database: cliArguments.dbname,
        username: cliArguments.dbusername,
        password: cliArguments.dbpassword
      },
      options: {}
    };
  }

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
