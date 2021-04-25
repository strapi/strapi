'use strict';

const path = require('path');
const _ = require('lodash');
const session = require('koa-session');

/**
 * Session middleware
 */
module.exports = strapi => {
  const requireStore = store => {
    return require(path.resolve(strapi.config.appPath, 'node_modules', 'koa-' + store));
  };

  const defineStore = session => {
    if (_.isEmpty(_.get(session, 'client'))) {
      return strapi.log.error(
        '(middleware:session) please provide a valid client to store session'
      );
    } else if (_.isEmpty(_.get(session, 'connection'))) {
      return strapi.log.error(
        '(middleware:session) please provide connection for the session store'
      );
    } else if (!strapi.config.get(`database.connections.${session.connection}`)) {
      return strapi.log.error(
        '(middleware:session) please provide a valid connection for the session store'
      );
    }

    session.settings = strapi.config.get(`database.connections.${session.connection}`);

    // Define correct store name to avoid require to failed.
    switch (session.client.toLowerCase()) {
      case 'redis': {
        const store = requireStore('redis');

        session.settings.db = session.settings.database;

        return store(session.settings);
      }
      case 'mysql': {
        const Store = requireStore('mysql-session');

        return new Store(session.settings);
      }
      case 'mongo': {
        const Store = requireStore('generic-session-mongo');

        session.settings.db = session.settings.database;

        return new Store(session.settings);
      }
      case 'postgresql': {
        const Store = requireStore('pg-session');

        return new Store(session.settings, session.options);
      }
      case 'rethink': {
        const Store = requireStore('generic-session-rethinkdb');

        session.settings.dbName = session.settings.database;
        session.settings.tableName = session.settings.table;

        const sessionStore = new Store({
          connection: session.settings,
        });

        // Create the DB, tables and indexes to store sessions.
        sessionStore.setup();

        return sessionStore;
      }
      case 'sqlite': {
        const Store = requireStore('sqlite3-session');

        return new Store(session.fileName, session.options);
      }
      case 'sequelize': {
        const Store = requireStore('generic-session-sequelize');

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
  };

  return {
    initialize() {
      strapi.app.keys = strapi.config.get('middleware.settings.session.secretKeys');

      if (
        _.has(strapi.config.middleware.settings.session, 'client') &&
        _.isString(strapi.config.middleware.settings.session.client) &&
        strapi.config.middleware.settings.session.client !== 'cookie'
      ) {
        const store = defineStore(strapi.config.middleware.settings.session);

        if (!_.isEmpty(store)) {
          // Options object contains the defined store, the custom middlewares configurations
          // and also the function which are located to `./config/functions/session.js`
          const options = _.assign(
            {
              store,
            },
            strapi.config.middleware.settings.session
          );

          strapi.app.use(session(options, strapi.app));
          strapi.app.use((ctx, next) => {
            ctx.state = ctx.state || {};
            ctx.state.session = ctx.session || {};

            return next();
          });
        }
      } else if (
        _.has(strapi.config.middleware.settings.session, 'client') &&
        _.isString(strapi.config.middleware.settings.session.client) &&
        strapi.config.middleware.settings.session.client === 'cookie'
      ) {
        const options = _.assign(strapi.config.middleware.settings.session);

        strapi.app.use(session(options, strapi.app));
        strapi.app.use((ctx, next) => {
          ctx.state = ctx.state || {};
          ctx.state.session = ctx.session || {};

          return next();
        });
      }
    },
  };
};
