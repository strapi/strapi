'use strict';

const { get, map, mapValues } = require('lodash/fp');

module.exports = ({ strapi }) => ({
  graphqlScalarToOperators(graphqlScalar) {
    const { GRAPHQL_SCALAR_OPERATORS } = strapi.plugin('graphql').service('constants');
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    const associations = mapValues(
      map(operatorName => operators[operatorName]),
      GRAPHQL_SCALAR_OPERATORS
    );

    return get(graphqlScalar, associations);
  },
});
