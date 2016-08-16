'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');

// Array of supported clients.
const CLIENTS = [
  'pg',
  'mysql', 'mysql2',
  'sqlite3',
  'mariasql',
  'oracle', 'strong-oracle',
  'mssql',
  'websql'
];

/**
 * Knex hook
 */

module.exports = strapi => {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      connections: {
        default: {
          client: 'sqlite3',
          debug: false,
          acquireConnectionTimeout: 60000,
          useNullAsDefault: true,
          connection: {
            filename: './data/db.sqlite'
          },
          migrations: {
            tableName: 'migrations'
          }
        }
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      strapi.connections = {};

      // For each connection in the config register a new Knex connection.
      _.forEach(strapi.config.connections, (connection, name) => {

        // Make sure we use the client even if the typo is not the exact one.
        switch (connection.client) {
          case 'postgre':
          case 'postgres':
          case 'postgresql':
            connection.client = 'pg';
            break;
          case 'sqlite':
            connection.client = 'sqlite3';
            break;
          case 'maria':
          case 'mariadb':
            connection.client = 'mariasql';
            break;
          case 'ms':
            connection.client = 'mssql';
            break;
          case 'web':
            connection.client = 'websql';
            break;
        }

        // Make sure the client is supported.
        if (!_.includes(CLIENTS, connection.client)) {
          strapi.log.error('The client `' + connection.client + '` for the `' + name + '` connection is not supported.');
          strapi.stop();
        }

        // Make sure the client is installed in the application
        // `node_modules` directory.
        try {
          require(path.resolve(strapi.config.appPath, 'node_modules', connection.client));
        } catch (err) {
          strapi.log.error('The client `' + connection.client + '` is not installed.');
          strapi.log.error('You can install it with `$ npm install ' + connection.client + ' --save`.');
          strapi.stop();
        }

        // Finally, use the client via `knex`.
        // If anyone has a solution to use different paths for `knex` and clients
        // please drop us an email at support@strapi.io-- it would avoid the Strapi
        // applications to have `knex` as a dependency.
        try {
          strapi.connections[name] = require(path.resolve(strapi.config.appPath, 'node_modules', 'knex'))(connection);
        } catch (err) {
          strapi.log.error('Impossible to use the `' + name + '` connection...');
          strapi.log.error(err);
          strapi.stop();
        }
      });

      cb();
    }
  };

  return hook;
};
