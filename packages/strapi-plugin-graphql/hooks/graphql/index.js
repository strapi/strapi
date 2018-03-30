'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const { graphqlKoa, graphiqlKoa } = require('apollo-server-koa');

module.exports = strapi => {
  return {
    beforeInitialize: async function() {
      // Try to inject this hook just after the others hooks to skip the router processing.
      strapi.config.hook.load.order = strapi.config.hook.load.order.concat(Object.keys(strapi.hook).filter(hook => hook !== 'graphql'));
      strapi.config.hook.load.order.push('graphql');

      // Load core utils.
      const utils = require(path.resolve(strapi.config.appPath, 'node_modules', 'strapi', 'lib', 'utils'));

      // Set '*.graphql' files configurations in the global variable.
      await Promise.all([
        // Load root configurations.
        new Promise((resolve, reject) => {
          glob('./config/**/*.*(graphql)', {
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
          glob('./api/*/config/**/*.*(graphql)', {
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
          glob('./plugins/*/config/!(generated)/*.*(graphql)', {
            cwd: strapi.config.appPath
          }, (err, files) => {
            if (err) {
              return reject(err);
            }

            utils.loadConfig.call(strapi, files, true).then(resolve).catch(reject);
          });
        })
      ]);
    },

    initialize: function(cb) {
      const schema = strapi.plugins.graphql.services.graphql.generateSchema();

      if (_.isEmpty(schema)) {
        strapi.log.warn(`GraphQL schema has not been generated because it's empty`);

        return cb();
      }

      const router = strapi.koaMiddlewares.routerJoi();

      router.post(strapi.plugins.graphql.config.endpoint, async (ctx, next) => graphqlKoa({ schema, context: ctx })(ctx, next));
      router.get(strapi.plugins.graphql.config.endpoint, async (ctx, next) => graphqlKoa({ schema, context: ctx })(ctx, next));

      router.get('/graphiql', graphiqlKoa({ endpointURL: strapi.plugins.graphql.config.endpoint }));

      strapi.app.use(router.middleware());

      cb();
    }
  };
};
