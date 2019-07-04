'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const path = require('path');
const fs = require('fs');
const url = require('url');
const _ = require('lodash');
const mongoose = require('mongoose');
const Mongoose = mongoose.Mongoose;

const relations = require('./relations');
const buildQuery = require('./buildQuery');
const getQueryParams = require('./get-query-params');
const mountModels = require('./mount-models');

/**
 * Mongoose hook
 */

const defaults = {
  defaultConnection: 'default',
  host: 'localhost',
  port: 27017,
  database: 'strapi',
  authenticationDatabase: '',
  ssl: false,
  debug: false,
};

const isMongooseConnection = ({ connector }) =>
  connector === 'strapi-hook-mongoose';

module.exports = function(strapi) {
  function initialize(cb) {
    const { connections } = strapi.config;

    const connectionsPromises = Object.keys(connections)
      .filter(key => isMongooseConnection(connections[key]))
      .map(async connectionName => {
        const connection = connections[connectionName];
        const instance = new Mongoose();

        _.defaults(connection.settings, strapi.config.hook.settings.mongoose);

        const {
          uri,
          host,
          port,
          username,
          password,
          database,
          srv,
        } = connection.settings;

        const uriOptions = uri ? url.parse(uri, true).query : {};
        const { authenticationDatabase, ssl, debug } = _.defaults(
          connection.options,
          uriOptions,
          strapi.config.hook.settings.mongoose
        );
        const isSrv = srv === true || srv === 'true';

        // Connect to mongo database
        const connectOptions = {};

        if (!_.isEmpty(username)) {
          connectOptions.user = username;

          if (!_.isEmpty(password)) {
            connectOptions.pass = password;
          }
        }

        if (!_.isEmpty(authenticationDatabase)) {
          connectOptions.authSource = authenticationDatabase;
        }

        connectOptions.ssl = ssl === true || ssl === 'true';
        connectOptions.useNewUrlParser = true;
        connectOptions.dbName = database;
        connectOptions.useCreateIndex = true;

        try {
          /* FIXME: for now, mongoose doesn't support srv auth except the way including user/pass in URI.
           * https://github.com/Automattic/mongoose/issues/6881 */
          await instance.connect(
            uri ||
              `mongodb${isSrv ? '+srv' : ''}://${username}:${password}@${host}${
                !isSrv ? ':' + port : ''
              }/`,
            connectOptions
          );
        } catch ({ message }) {
          const errMsg = message.includes(`:${port}`)
            ? 'Make sure your MongoDB database is running...'
            : message;

          return cb(errMsg);
        }

        const initFunctionPath = path.resolve(
          strapi.config.appPath,
          'config',
          'functions',
          'mongoose.js'
        );

        if (fs.existsSync(initFunctionPath)) {
          require(initFunctionPath)(instance, connection);
        }

        instance.set('debug', debug === true || debug === 'true');
        instance.set('useFindAndModify', false);

        const ctx = {
          instance,
          connection,
        };

        return Promise.all([
          mountGroups(connectionName, ctx),
          mountApis(connectionName, ctx),
          mountAdmin(connectionName, ctx),
          mountPlugins(connectionName, ctx),
        ]);
      });

    return Promise.all(connectionsPromises).then(() => cb(), err => cb(err));
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
    ...relations,
  };
};
