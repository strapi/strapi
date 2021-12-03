'use strict';

const path = require('path');
const { defaultsDeep, isEmpty, get, isObject, has, isString, assign } = require('lodash/fp');
const session = require('koa-session');

const defaults = {
  enabled: true,
  client: 'cookie',
  key: 'strapi.sid',
  prefix: 'strapi:sess:',
  ttl: 864000000,
  rolling: false,
  secretKeys: ['mySecretKey1', 'mySecretKey2'],
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge: 864000000,
    rewrite: true,
    signed: false,
  },
};

/**
 * @type {import('../').MiddlewareFactory}
 */
module.exports = (config, { strapi }) => {
  let sessionConfig = defaultsDeep(defaults, config);

  const requireStore = store => {
    return require(path.resolve(strapi.dirs.root, 'node_modules', 'koa-' + store));
  };

  const defineStore = session => {
    if (isEmpty(get('client', session))) {
      throw strapi.log.error('(middleware:session) please provide a valid client to store session');
    } else if (!get('database.connection.connection', strapi.config)) {
      throw strapi.log.error(
        '(middleware:session) please provide a valid connection for the session store'
      );
    }

    session.settings = get('database.connection.connection', strapi.config);

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

        return new Store(session.settings.filename, session.options);
      }
      case 'sequelize': {
        const Store = requireStore('generic-session-sequelize');

        // Sequelize needs to be instantiated.
        if (!isObject(strapi.sequelize)) {
          return null;
        }

        return new Store(strapi.sequelize, session.options);
      }
      default: {
        return null;
      }
    }
  };

  strapi.server.app.keys = sessionConfig.secretKeys;

  if (
    has('client', sessionConfig) &&
    isString(sessionConfig.client) &&
    sessionConfig.client !== 'cookie'
  ) {
    const store = defineStore(sessionConfig);

    if (!isEmpty(store)) {
      // Options object contains the defined store, the custom middlewares configurations
      // and also the function which are located to `./config/functions/session.js`
      const options = assign(
        {
          store,
        },
        sessionConfig
      );

      strapi.server.use(session(options, strapi.server.app));
      strapi.server.use((ctx, next) => {
        ctx.state = ctx.state || {};
        ctx.state.session = ctx.session || {};

        return next();
      });
    }
  } else if (
    has('client', sessionConfig) &&
    isString(sessionConfig.client) &&
    sessionConfig.client === 'cookie'
  ) {
    const options = assign(sessionConfig);

    strapi.server.use(session(options, strapi.server.app));
    strapi.server.use((ctx, next) => {
      ctx.state = ctx.state || {};
      ctx.state.session = ctx.session || {};

      return next();
    });
  }
};
