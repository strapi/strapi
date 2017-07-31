#!/usr/bin/env node

'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Helpers.
const logger = require('strapi-utils').logger;

// Is the connection valid?
const knex = require('strapi-utils').knex;

/**
 * `$ strapi migrate:run`
 *
 * Run migrations for a specified connection.
 */

module.exports = function () {

  // Pass the original CLI arguments down to the generator.
  const cliArguments = Array.prototype.slice.call(arguments);

  // Build initial scope.
  const scope = {
    rootPath: process.cwd(),
    strapiRoot: path.resolve(__dirname, '..'),
    args: cliArguments,
    environment: process.NODE_ENV || 'development'
  };

  // Save the first argument as the name of the connection.
  scope.connection = cliArguments[0];

  // Make sure the connection is valid.
  knex(scope);

  // Run the rollback.
  scope.db.migrate.rollback()
    .then(() => {
      logger.info('Rollback successfully made for the `' + scope.connection + '` connection!');
      process.exit(0);
    });
};
