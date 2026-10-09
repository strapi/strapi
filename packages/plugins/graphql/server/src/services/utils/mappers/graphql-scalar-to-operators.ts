import { mapValues } from 'lodash';
import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  graphqlScalarToOperators(graphqlScalar: string) {
    const { GRAPHQL_SCALAR_OPERATORS } = strapi.plugin('graphql').service('constants');
    const { operators } = strapi.plugin('graphql').service('builders').filters;
    type Operator = (typeof operators)[keyof typeof operators];
    const operatorsByName: Record<string, Operator> = operators;

    const associations: Record<string, Operator[]> = mapValues(
      GRAPHQL_SCALAR_OPERATORS,
      (operatorNames: readonly string[]) =>
        operatorNames.map((operatorName) => operatorsByName[operatorName])
    );

    return associations[graphqlScalar] as Operator[] | undefined;
  },
});
