'use strict';

const { first } = require('lodash/fp');

module.exports = ({ strapi }) => () => {
  const { GRAPHQL_SCALAR_OPERATORS } = strapi.plugin('graphql').service('constants');

  return (
    Object.entries(GRAPHQL_SCALAR_OPERATORS)
      // To be valid, a GraphQL scalar must have at least one operator enabled
      .filter(([, value]) => value.length > 0)
      // Only keep the key (the scalar name)
      .map(first)
  );
};
