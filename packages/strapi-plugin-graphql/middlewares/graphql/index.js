'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const { graphqlKoa, graphiqlKoa } = require('apollo-server-koa');

module.exports = strapi => {
  return {
    beforeInitialize: function() {
      // Try to inject this middleware just after the parser to skip the router processing.
      const index = strapi.config.middleware.load.after.indexOf('parser');

      if (index !== -1) {
        strapi.config.middleware.load.after.splice(index + 1, 0, 'graphql');
      } else {
        strapi.config.middleware.load.after.push('graphql');
      }
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
