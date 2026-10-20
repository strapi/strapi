import { inputObjectType } from 'nexus';
import type * as Nexus from 'nexus';
import type { Context } from '../../types';

/**
 * Build a map of filters type for every GraphQL scalars
 * @return {Object<string, NexusInputTypeDef>}
 */
const buildScalarFilters = ({ strapi }: Context) => {
  const { naming, mappers } = strapi.plugin('graphql').service('utils');
  const { helpers } = strapi.plugin('graphql').service('internals');

  // `getEnabledScalars` keeps develop's published element type; it returns scalar names.
  return (helpers.getEnabledScalars() as string[]).reduce((acc: any, type: string) => {
    // `graphqlScalarToOperators` keeps develop's published (wrong) `boolean` return type.
    const operators = mappers.graphqlScalarToOperators(type) as unknown as
      { add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string): void }[] | undefined;
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
            // Operators keep develop's published `ObjectDefinitionBlock` parameter; they only add fields.
            operator.add(t as unknown as Nexus.blocks.ObjectDefinitionBlock<string>, type);
          }
        },
      }),
    };
  }, {});
};

export default (context: Context) => ({
  scalars: buildScalarFilters(context),
});
