import { StrapiCTX } from '../../../types/strapi-ctx';
import { get, map, mapValues } from 'lodash/fp';

export default ({ strapi }: StrapiCTX) => ({
  graphqlScalarToOperators(graphqlScalar: string) {
    const { GRAPHQL_SCALAR_OPERATORS } = strapi.plugin('graphql').service('constants');
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    const associations = mapValues(
      map((operatorName) => operators[operatorName as keyof typeof operators]),
      GRAPHQL_SCALAR_OPERATORS
    );

    return get(graphqlScalar, associations);
  },
});
