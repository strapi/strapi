import { StrapiCTX } from '../../../types/strapi-ctx';
import { builder } from '../../builders/pothosBuilder';

/**
 * Build a map of filters type for every GraphQL scalars
 */
const buildScalarFilters = ({ strapi }: StrapiCTX) => {
  const { naming, mappers } = strapi.plugin('graphql').service('utils');
  const { helpers } = strapi.plugin('graphql').service('internals');

  return helpers.getEnabledScalars().reduce((acc: any, type: any) => {
    const operators = mappers.graphqlScalarToOperators(type);
    const typeName = naming.getScalarFilterInputTypeName(type);

    if (!operators || operators.length === 0) {
      return acc;
    }

    return {
      ...acc,

      [typeName]: builder.inputType(typeName, {
        fields(t) {
          const fieldsObj: any = {};
          for (const operator of operators) {
            fieldsObj[operator.fieldName] = operator.add(t, type);
          }

          return fieldsObj;
        },
      }),
    };
  }, {});
};

export default (context: StrapiCTX) => ({
  scalars: buildScalarFilters(context),
});
