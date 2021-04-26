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
const registerCoreMigrations = require('./migrations');

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
  const { connections } = strapi.config;
  const bookshelfConnections = Object.keys(connections).filter(key =>
    isBookshelfConnection(connections[key])
  );

  function initialize() {
    initKnex(strapi);

    registerCoreMigrations();

    const GLOBALS = {};

    const connectionsPromises = bookshelfConnections.map(connectionName => {
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

      return mountConnection(connectionName, ctx);
    });

    return Promise.all(connectionsPromises);
  }

  async function mountConnection(connectionName, ctx) {
    if (strapi.models['core_store'].connection === connectionName) {
      await mountCoreStore(ctx);
    }

    const finalizeMountings = await Promise.all([
      mountComponents(connectionName, ctx),
      mountApis(connectionName, ctx),
      mountAdmin(connectionName, ctx),
      mountPlugins(connectionName, ctx),
    ]);

    for (const finalizeMounting of _.flattenDeep(finalizeMountings)) {
      await finalizeMounting();
    }
  }

  function mountCoreStore(ctx) {
    return mountModels(
      {
        models: {
          core_store: strapi.models['core_store'],
        },
        target: strapi.models,
      },
      ctx,
      { selfFinalize: true }
    );
  }

  function mountComponents(connectionName, ctx) {
    const options = {
      models: _.pickBy(strapi.components, ({ connection }) => connection === connectionName),
      target: strapi.components,
    };

    return mountModels(options, ctx);
  }

  function mountApis(connectionName, ctx) {
    const options = {
      models: _.pickBy(
        strapi.models,
        ({ connection }, name) => connection === connectionName && name !== 'core_store'
      ),
      target: strapi.models,
    };

    return mountModels(options, ctx);
  }

  function mountAdmin(connectionName, ctx) {
    const options = {
      models: _.pickBy(strapi.admin.models, ({ connection }) => connection === connectionName),
      target: strapi.admin.models,
    };

    return mountModels(options, ctx);
  }

  function mountPlugins(connectionName, ctx) {
    return Promise.all(
      Object.keys(strapi.plugins).map(name => {
        const plugin = strapi.plugins[name];
        return mountModels(
          {
            models: _.pickBy(plugin.models, ({ connection }) => connection === connectionName),
            target: plugin.models,
          },
          ctx
        );
      })
    );
  }

  async function destroy() {
    await Promise.all(bookshelfConnections.map(connName => strapi.connections[connName].destroy()));
  }

  return {
    defaults,
    initialize,
    getQueryParams,
    buildQuery,
    queries,
    destroy,
    ...relations,
    get defaultTimestamps() {
      return ['created_at', 'updated_at'];
    },
  };
};
