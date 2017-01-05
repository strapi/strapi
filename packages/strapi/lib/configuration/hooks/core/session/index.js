'use strict';

/**
 * Module dependencies
 */

// Core modules
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Session hook
 */

module.exports = strapi => {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      key: 'strapi.sid',
      prefix: 'strapi:sess:',
      ttl: null,
      rolling: false,
      secretKeys: ['mySecretKey1', 'mySecretKey2'],
      cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // One day in ms
        rewrite: true,
        signed: false
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (_.isPlainObject(strapi.config.session) && !_.isEmpty(strapi.config.session)) {
        strapi.app.keys = _.get(strapi.config.session, 'secretKeys') || strapi.config.hooks.session.secretKeys;

        if (strapi.config.session.hasOwnProperty('store') && _.isString(strapi.config.session.store)) {
          const store = hook.defineStore(strapi.config.session);

          if (!_.isEmpty(store)) {
            try {
              // Options object contains the defined store, the custom hooks configurations
              // and also the function which are located to `./config/functions/session.js`
              const options = _.assign({
                store
              },
                strapi.config.hooks.session,
                _.pick(strapi.config.session, ['genSid', 'errorHandler', 'valid', 'beforeSave'])
              );

              strapi.app.use(strapi.middlewares.convert(strapi.middlewares.genericSession(options)));
            } catch (err) {
              return cb(err);
            }
          }
        }
      }

      cb();
    },

    defineStore: (session) => {
      // Define correct store name to avoid require to failed.
      switch (session.store.toLowerCase()) {
        case 'redis': {
          const store = hook.requireStore('redis');

          return store(session.connection);
        }
        case 'mysql': {
          const Store = hook.requireStore('mysql-session');

          return new Store(session.connection);
        }
        case 'mongo': {
          const Store = hook.requireStore('generic-session-mongo');

          return new Store(session.connection);
        }
        case 'postgresql': {
          const Store = hook.requireStore('pg-session');

          return new Store(session.connection, session.options);
        }
        case 'rethink': {
          const Store = hook.requireStore('generic-session-rethinkdb');

          const sessionStore = new Store({
            connection: session.connection
          });

          // Create the DB, tables and indexes to store sessions.
          sessionStore.setup();

          return sessionStore;
        }
        case 'sqlite': {
          const Store = hook.requireStore('sqlite3-session');

          return new Store(session.fileName, session.options);
        }
        case 'sequelize': {
          const Store = hook.requireStore('generic-session-sequelize');

          // Sequelize needs to be instantiated.
          if (!_.isObject(strapi.sequelize)) {
            return null;
          }

          return new Store(strapi.sequelize, session.options);
        }
        default: {
          return null;
        }
      }
    },

    requireStore: (store) => {
      try {
        return require(path.resolve(strapi.config.appPath, 'node_modules', 'koa-' + store));
      } catch (err) {
        throw err;
      }
    }
  };

  return hook;
};
