'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const { graphqlKoa, graphiqlKoa } = require('apollo-server-koa');

module.exports = strapi => {
  return {
    beforeInitialize: function() {
      // Try to inject this hook just after the others hooks to skip the router processing.
      strapi.config.hook.load.order = strapi.config.hook.load.order.concat(Object.keys(strapi.hook).filter(hook => hook !== 'graphql'));
      strapi.config.hook.load.order.push('graphql');
    },

    initialize: function(cb) {
      const router = strapi.koaMiddlewares.routerJoi();
      const schema = strapi.plugins.graphql.services.graphql.generateSchema();

      router.post(strapi.plugins.graphql.config.endpoint, graphqlKoa({ schema }));
      router.get(strapi.plugins.graphql.config.endpoint, graphqlKoa({ schema }));

      router.get('/graphiql', graphiqlKoa({ endpointURL: strapi.plugins.graphql.config.endpoint }));

      strapi.app.use(router.middleware());

      cb();
    }
  };
};
