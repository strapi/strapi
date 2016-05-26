#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Master of ceremonies for generators.
const generate = require('strapi-generate');

// Logger.
const logger = require('strapi-utils').logger;

// Is the connection valid?
const knex = require('strapi-utils').knex;

/**
 * `$ strapi migrate:make`
 *
 * Generate migration files for a specified connection.
 */

module.exports = function () {

  // Pass the original CLI arguments down to the generator.
  const cliArguments = Array.prototype.slice.call(arguments);

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    generatorType: 'migrations',
    args: cliArguments,
    environment: process.NODE_ENV || 'development'
  };

  // Save the first argument as the name of the connection.
  scope.connection = cliArguments[0];

  // Make sure the connection is valid.
  knex(scope);

  // Return the scope and the response (`error` or `success`).
  return generate(scope, {

    // Log and exit the REPL in case there is an error
    // while we were trying to generate the migration files.
    error: function returnError(err) {
      logger.error(err);
      process.exit(1);
    },

    // Simply, log and exit the REPL in case of success.
    success: function returnSuccess() {
      logger.info('Migration file successfully generated at `' + path.resolve(scope.rootPath, 'data', 'migrations', scope.connection) + '`.');
      logger.info('Seed file created at `' + path.resolve(scope.rootPath, 'data', 'seeds', scope.connection) + '`.');
      logger.warn('This migration has been automatically generated.');
      logger.warn('We strongly advise you to manually verify those information.');
      process.exit(0);
    }
  });
};
