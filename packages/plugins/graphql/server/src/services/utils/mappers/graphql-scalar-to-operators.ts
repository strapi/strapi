import { mapValues, get } from 'lodash';
import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  graphqlScalarToOperators(graphqlScalar: string) {
    const { GRAPHQL_SCALAR_OPERATORS } = strapi.plugin('graphql').service('constants');
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    const associations = mapValues(GRAPHQL_SCALAR_OPERATORS, (operatorNames: string[]) =>
      operatorNames.map((operatorName) => operators[operatorName])
    );

    return get(associations, graphqlScalar);
  },
});
