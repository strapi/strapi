'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/*
const relations = require('./relations');
const buildQuery = require('./buildQuery');
const getQueryParams = require('./get-query-params');
const mountModels = require('./mount-models');
const queries = require('./queries');
*/

/**
 * Firestore hook
 */

const defaults = {
  defaultConnection: 'default',
  // TODO
};

const isFirestoreConnection = ({ connector }) => connector === 'mongoose';

module.exports = function(strapi) {
  function initialize() {
    const { connections } = strapi.config;

    const connectionsPromises = Object.keys(connections)
      .filter(key => isFirestoreConnection(connections[key]))
      .map(async connectionName => {
        const connection = connections[connectionName];
        // TODO: const instance = new Firestore();

        _.defaults(connection.settings, strapi.config.hook.settings.firestore);

        // TODO: const {  } = connection.settings;

        // TODO: Connect to firestore database

        try {
          //await instance.connect();
        } catch (error) {
          const err = new Error(`Error connecting to the Firestore database. ${error.message}`);
          delete err.stack;
          throw err;
        }

        /*
        const ctx = {
          instance,
          connection,
        };
        */

        // TODO: _.set(strapi, `connections.${connectionName}`, instance);

        /* */
        return Promise.all([
          /*
          mountComponents(connectionName, ctx),
          mountApis(connectionName, ctx),
          mountAdmin(connectionName, ctx),
          mountPlugins(connectionName, ctx),
          */
        ]);
      });

    return Promise.all(connectionsPromises);
  }

  /*
  function mountComponents(connectionName, ctx) {
    const options = {
      models: _.pickBy(
        strapi.components,
        ({ connection }) => connection === connectionName
      ),
      target: strapi.components,
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
          },
          ctx
        );
      })
    );
  }
  */

  return {
    defaults,
    initialize,
    // getQueryParams,
    // buildQuery,
    // queries,
    // ...relations,
  };
};
