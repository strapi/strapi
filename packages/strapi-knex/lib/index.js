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
      connection: {
        host: 'locahost',
        charset: 'utf8'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      strapi.connections = {};

      // For each connection in the config register a new Knex connection.
      _.forEach(_.pickBy(strapi.config.connections, {connector: 'strapi-bookshelf'}), (connection, name) => {

        // Make sure we use the client even if the typo is not the exact one.
        switch (connection.settings.client) {
          case 'postgre':
          case 'postgres':
          case 'postgresql':
            connection.settings.client = 'pg';
            break;
          case 'sqlite':
            connection.settings.client = 'sqlite3';
            break;
          case 'maria':
          case 'mariadb':
            connection.settings.client = 'mariasql';
            break;
          case 'ms':
            connection.settings.client = 'mssql';
            break;
          case 'web':
            connection.settings.client = 'websql';
            break;
        }

        // Make sure the client is supported.
        if (!_.includes(CLIENTS, connection.settings.client)) {
          strapi.log.error('The client `' + connection.settings.client + '` for the `' + name + '` connection is not supported.');
          strapi.stop();
        }

        // Make sure the client is installed in the application
        // `node_modules` directory.
        try {
          require(path.resolve(strapi.config.appPath, 'node_modules', connection.settings.client));
        } catch (err) {
          strapi.log.error('The client `' + connection.settings.client + '` is not installed.');
          strapi.log.error('You can install it with `$ npm install ' + connection.settings.client + ' --save`.');
          strapi.stop();
        }

        const options = _.defaultsDeep({
          client: connection.settings.client,
          connection: {
            host: _.get(connection.settings, 'host'),
            user: _.get(connection.settings, 'username'),
            password: _.get(connection.settings, 'password'),
            database: _.get(connection.settings, 'database'),
            charset: _.get(connection.settings, 'charset')
          }
        }, strapi.config.hooks.knex);

        // Finally, use the client via `knex`.
        // If anyone has a solution to use different paths for `knex` and clients
        // please drop us an email at support@strapi.io-- it would avoid the Strapi
        // applications to have `knex` as a dependency.
        try {
          // Try to require from local dependency.
          strapi.connections[name] = require(path.resolve(strapi.config.appPath, 'node_modules', 'knex'))(options);
        } catch (err) {
          strapi.log.error('Impossible to use the `' + name + '` connection...');
          strapi.log.warn('Be sure that your client `' + name + '` are in the same node_modules directory');
          strapi.log.error(err);
          strapi.stop();
        }
      });

      cb();
    }
  };

  return hook;
};
