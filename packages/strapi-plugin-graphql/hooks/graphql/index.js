'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const { graphqlKoa } = require('apollo-server-koa');
const koaPlayground = require('graphql-playground-middleware-koa').default;
const depthLimit = require('graphql-depth-limit');

module.exports = strapi => {
  return {
    beforeInitialize: async function(){
      // Try to inject this hook just after the others hooks to skip the router processing.
      if (!_.get(strapi.config.hook.load, 'after')) {
        _.set(strapi.config.hook.load, 'after', []);
      }

      strapi.config.hook.load.after.push('graphql');

      // Load core utils.
      const utils = require(path.resolve(strapi.config.appPath, 'node_modules', 'strapi', 'lib', 'utils'));

      // Set '*.graphql' files configurations in the global variable.
      await Promise.all([
        // Load root configurations.
        new Promise((resolve, reject) => {
          glob('./config/*.graphql', {
            cwd: strapi.config.appPath
          }, (err, files) => {
            if (err) {
              return reject(err);
            }

            utils.loadConfig.call(strapi, files, true).then(resolve).catch(reject);
          });
        }),
        // Load APIs configurations.
        new Promise((resolve, reject) => {
          glob('./api/*/config/*.graphql', {
            cwd: strapi.config.appPath
          }, (err, files) => {
            if (err) {
              return reject(err);
            }

            utils.loadConfig.call(strapi, files, true).then(resolve).catch(reject);
          });
        }),
        // Load plugins configurations.
        new Promise((resolve, reject) => {
          glob('./plugins/*/config/*.graphql', {
            cwd: strapi.config.appPath
          }, (err, files) => {
            if (err) {
              return reject(err);
            }

            utils.loadConfig.call(strapi, files, true).then(resolve).catch(reject);
          });
        })
      ]);

      /*
       * Create a merge of all the GraphQL configuration.
       */

      // Set path with initial state.
      _.set(strapi.plugins.graphql, 'config._schema.graphql', { definition: '', query: '', type : {}, resolver: {} });

      // Merge user API.
      Object.keys(strapi.api || {}).reduce((acc, current) => {
        const { definition, query, type, resolver } = _.get(strapi.api[current], 'config.schema.graphql', {});

        acc.definition += definition || '';
        acc.query += query || '';

        return _.merge(acc, {
          type,
          resolver
        });
      }, strapi.plugins.graphql.config._schema.graphql);

      // Merge plugins API.
      Object.keys(strapi.plugins || {}).reduce((acc, current) => {
        const { definition, query, type, resolver } = _.get(strapi.plugins[current], 'config.schema.graphql', {});

        acc.definition += definition || '';
        acc.query += query || '';

        return _.merge(acc, {
          type,
          resolver
        });
      }, strapi.plugins.graphql.config._schema.graphql);
    },

    initialize: function(cb) {
      const schema = strapi.plugins.graphql.services.graphql.generateSchema();

      if (_.isEmpty(schema)) {
        strapi.log.warn('GraphQL schema has not been generated because it\'s empty');

        return cb();
      }

      const router = strapi.koaMiddlewares.routerJoi();

      router.post(strapi.plugins.graphql.config.endpoint, async (ctx, next) => graphqlKoa({
        schema,
        context: ctx,
        validationRules: [ depthLimit(strapi.plugins.graphql.config.depthLimit) ]
      })(ctx, next));

      router.get(strapi.plugins.graphql.config.endpoint, async (ctx, next) => graphqlKoa({
        schema,
        context: ctx,
        validationRules: [ depthLimit(strapi.plugins.graphql.config.depthLimit) ]
      })(ctx, next));

      // Disable GraphQL Playground in production environment.
      if (strapi.config.environment !== 'production' || strapi.plugins.graphql.config.playgroundAlways) {
        router.get('/playground', koaPlayground({ endpoint: strapi.plugins.graphql.config.endpoint}));
      }

      strapi.app.use(router.middleware());

      cb();
    }
  };
};
