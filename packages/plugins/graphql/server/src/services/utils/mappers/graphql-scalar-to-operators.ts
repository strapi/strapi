import fp from 'lodash/fp.js';
import type { Context } from '../../types';

const { get, map, mapValues } = fp;

export default ({ strapi }: Context) => ({
  graphqlScalarToOperators(graphqlScalar: string) {
    const { GRAPHQL_SCALAR_OPERATORS } = strapi.plugin('graphql').service('constants');
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    const associations = mapValues(
      map((operatorName: string) => operators[operatorName]),
      GRAPHQL_SCALAR_OPERATORS
    );

    return get(graphqlScalar, associations);
  },
});
