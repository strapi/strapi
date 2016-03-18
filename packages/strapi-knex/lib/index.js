'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Knex hook
 */

module.exports = function (strapi) {
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

    initialize: function (cb) {
      strapi.connections = {};

      // For each connection in the config register a new Knex connection.
      _.forEach(strapi.config.connections, function (connection, name) {
        strapi.connections[name] = require('knex')(connection);

        // Make sure the client is installed.
        try {
          require(path.resolve(strapi.config.appPath, 'node_modules', connection.client));
        } catch (err) {
          strapi.log.error('The client `' + connection.client + '` is not installed.');
          strapi.log.error('You can install it with `$ npm install ' + connection.client + ' --save`.');
          strapi.stop();
        }
      });

      cb();
    }
  };

  return hook;
};
