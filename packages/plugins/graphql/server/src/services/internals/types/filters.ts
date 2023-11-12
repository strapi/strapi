import { inputObjectType } from 'nexus';
import type { Context } from '../../types';

/**
 * Build a map of filters type for every GraphQL scalars
 * @return {Object<string, NexusInputTypeDef>}
 */
const buildScalarFilters = ({ strapi }: Context) => {
  const { naming, mappers } = strapi.plugin('graphql').service('utils');
  const { helpers } = strapi.plugin('graphql').service('internals');

  return helpers.getEnabledScalars().reduce((acc: any, type: string) => {
    const operators = mappers.graphqlScalarToOperators(type);
    const typeName = naming.getScalarFilterInputTypeName(type);

    if (!operators || operators.length === 0) {
      return acc;
    }

    return {
      ...acc,

      [typeName]: inputObjectType({
        name: typeName,

        definition(t) {
          for (const operator of operators) {
            operator.add(t, type);
          }
        },
      }),
    };
  }, {});
};

export default (context: Context) => ({
  scalars: buildScalarFilters(context),
});
