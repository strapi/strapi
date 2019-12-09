'use strict';

/**
 * Module dependencies
 */

// Core
const path = require('path');
const fs = require('fs');
// Public node modules.
const _ = require('lodash');
const bookshelf = require('bookshelf');

// Local helpers.
const relations = require('./relations');
const buildQuery = require('./buildQuery');
const mountModels = require('./mount-models');
const getQueryParams = require('./get-query-params');
const queries = require('./queries');
const initKnex = require('./knex');

/**
 * Bookshelf hook
 */

/**
 * Default options
 */

const defaults = {
  defaultConnection: 'default',
  host: 'localhost',
};

const isBookshelfConnection = ({ connector }) => connector === 'bookshelf';

module.exports = function(strapi) {
  function initialize() {
    initKnex(strapi);

    const { connections } = strapi.config;
    const GLOBALS = {};

    const connectionsPromises = Object.keys(connections)
      .filter(key => isBookshelfConnection(connections[key]))
      .map(connectionName => {
        const connection = connections[connectionName];

        _.defaults(connection.settings, strapi.config.hook.settings.bookshelf);

        // Create Bookshelf instance for this connection.
        const ORM = new bookshelf(strapi.connections[connectionName]);

        const initFunctionPath = path.resolve(
          strapi.config.appPath,
          'config',
          'functions',
          'bookshelf.js'
        );

        if (fs.existsSync(initFunctionPath)) {
          require(initFunctionPath)(ORM, connection);
        }

        const ctx = {
          GLOBALS,
          connection,
          ORM,
        };

        return Promise.all([
          mountGroups(connectionName, ctx),
          mountApis(connectionName, ctx),
          mountAdmin(connectionName, ctx),
          mountPlugins(connectionName, ctx),
        ]);
      });

    return Promise.all(connectionsPromises);
  }

  function mountGroups(connectionName, ctx) {
    const options = {
      models: _.pickBy(
        strapi.groups,
        ({ connection }) => connection === connectionName
      ),
      target: strapi.groups,
      plugin: false,
    };

    return mountModels(options, ctx);
  }

  function mountApis(connectionName, ctx) {
    const options = {
      models: _.pickBy(
        strapi.models,
        ({ connection }) => connection === connectionName
      ),
      target: strapi.models,
      plugin: false,
    };

    return mountModels(options, ctx);
  }

  function mountAdmin(connectionName, ctx) {
    const options = {
      models: _.pickBy(
        strapi.admin.models,
        ({ connection }) => connection === connectionName
      ),
      target: strapi.admin.models,
      plugin: false,
    };

    return mountModels(options, ctx);
  }

  function mountPlugins(connectionName, ctx) {
    return Promise.all(
      Object.keys(strapi.plugins).map(name => {
        const plugin = strapi.plugins[name];
        return mountModels(
          {
            models: _.pickBy(
              plugin.models,
              ({ connection }) => connection === connectionName
            ),
            target: plugin.models,
            plugin: name,
          },
          ctx
        );
      })
    );
  }

  return {
    defaults,
    initialize,
    getQueryParams,
    buildQuery,
    queries,
    ...relations,
  };
};
