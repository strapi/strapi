'use strict';

/**
 * Module dependencies
 */

/* eslint-disable prefer-template */
// Node.js core.
const fs = require('fs');
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Check if connection is valid
 */

module.exports = scope => {

  // First, make sure the application we have access to
  // the migration generator.
  try {
    require.resolve(path.resolve(scope.rootPath, 'node_modules', 'strapi-hook-knex'));
  } catch (err) {
    console.error('Impossible to call the Knex migration tool.');
    console.error('You can install it with `$ npm install strapi-hook-knex --save`.');
    process.exit(1);
  }

  // Try to access the databases config and register connections
  // in the Knex query builder.
  try {
    fs.accessSync(path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'databases.json'), fs.F_OK | fs.R_OK);
  } catch (err) {
    console.error('No `databases.json` file detected at `' + path.resolve(scope.rootPath, 'config', 'environments', scope.environment) + '`.');
    console.error(err);
    process.exit(1);
  }

  // Save the connections and the current DB config.
  scope.connections = JSON.parse(fs.readFileSync(path.resolve(scope.rootPath, 'config', 'environments', scope.environment, 'databases.json'))).connections;
  scope.dbConfig = _.merge(scope.connections[scope.connection], {
    migrations: {
      directory: path.resolve(scope.rootPath, 'data', 'migrations', scope.connection)
    },
    seeds: {
      directory: path.resolve(scope.rootPath, 'data', 'seeds', scope.connection)
    }
  });

  // Make sure the specified connection exists in config.
  if (!_.has(scope.connections, scope.connection)) {
    console.error('No connection found for `' + scope.connection + '`.');
    process.exit(1);
  }

  // Make sure the needed client is installed.
  _.forEach(scope.connections, config => {
    try {
      scope.db = require(path.resolve(scope.rootPath, 'node_modules', 'knex'))(scope.dbConfig);
    } catch (err) {
      console.error('The client `' + config.client + '` is not installed.');
      console.error(err);
      process.exit(1);
    }
  });
};
