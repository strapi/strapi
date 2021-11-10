'use strict';

/**
 * GraphQL config helper with consistent defaults values
 */
module.exports = ({ strapi }) => {
  const { config: graphQLConfig } = strapi.plugin('graphql');

  return {
    get shadowCRUD() {
      return graphQLConfig('shadowCRUD', true);
    },

    get subscriptions() {
      return graphQLConfig('subscriptions', false);
    },

    get endpoint() {
      return graphQLConfig('endpoint', '/graphql');
    },

    get defaultLimit() {
      return graphQLConfig('defaultLimit');
    },

    get maxLimit() {
      return graphQLConfig('maxLimit', -1);
    },

    get depthLimit() {
      return graphQLConfig('depthLimit');
    },

    get apolloServer() {
      return graphQLConfig('apolloServer', {});
    },
  };
};
