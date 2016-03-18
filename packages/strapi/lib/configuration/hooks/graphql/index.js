'use strict';

/**
 * GraphQL hook
 */

// Public dependencies
const _ = require('lodash');

/**
 * GraphQL hook
 */

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      graphql: {
        enabled: false,
        route: '/graphql',
        graphiql: false,
        pretty: true,
        usefulQueries: true,
        ignoreMutations: true
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      const self = this;

      // Override default configuration for GraphQL
      _.assign(this.defaults.graphql, strapi.config.graphql);

      // Define GraphQL route to GraphQL schema
      if (this.defaults.graphql.enabled === true) {
        require('./schema').getGraphQLSchema(_.assign({
          collections: strapi.bookshelf.collections
        }, strapi.config.graphql), function (schemas) {

          // Mount GraphQL server
          strapi.app.use(strapi.middlewares.mount(self.defaults.graphql.route, strapi.middlewares.graphql((request, context) => ({
            schema: schemas,
            pretty: self.defaults.graphql.pretty,
            rootValue: {
              context: context
            },
            graphiql: self.defaults.graphql.graphiql
          }))));

          // Expose the GraphQL schemas at `strapi.schemas`
          strapi.schemas = schemas;

          cb();
        });
      } else {
        global.graphql = undefined;

        cb();
      }
    }
  };

  return hook;
};
