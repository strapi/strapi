import { mapValues, get } from 'lodash';
import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  graphqlScalarToOperators(graphqlScalar: string) {
    // Untyped, as the lookups were on develop: the published return type stays develop's.
    const { GRAPHQL_SCALAR_OPERATORS } = strapi.plugin('graphql').service<any>('constants');
    const { operators } = strapi.plugin('graphql').service<any>('builders').filters;

    const associations = mapValues(GRAPHQL_SCALAR_OPERATORS, (operatorNames: string[]) =>
      operatorNames.map((operatorName) => operators[operatorName])
    );

    return get(associations, graphqlScalar);
  },
});
