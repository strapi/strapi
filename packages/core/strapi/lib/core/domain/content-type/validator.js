'use strict';

const _ = require('lodash');
const { yup, toRegressedEnumValue } = require('@strapi/utils');

const LIFECYCLES = [
  'beforeCreate',
  'afterCreate',
  'beforeFindOne',
  'afterFindOne',
  'beforeFindMany',
  'afterFindMany',
  'beforeCount',
  'afterCount',
  'beforeCreateMany',
  'afterCreateMany',
  'beforeUpdate',
  'afterUpdate',
  'beforeUpdateMany',
  'afterUpdateMany',
  'beforeDelete',
  'afterDelete',
  'beforeDeleteMany',
  'afterDeleteMany',
];

// See GraphQL Spec https://spec.graphql.org/June2018/#sec-Names
const GRAPHQL_ENUM_REGEX = new RegExp('^[_A-Za-z][_0-9A-Za-z]*$');

const lifecyclesShape = _.mapValues(_.keyBy(LIFECYCLES), () =>
  yup
    .mixed()
    .nullable()
    .isFunction()
);

const contentTypeSchemaValidator = yup.object().shape({
  schema: yup.object().shape({
    info: yup
      .object()
      .shape({
        displayName: yup.string().required(),
        singularName: yup
          .string()
          .isKebabCase()
          .required(),
        pluralName: yup
          .string()
          .isKebabCase()
          .required(),
      })
      .required(),
    attributes: yup.object().test({
      name: 'valuesCollide',
      message: 'Some values collide when normalized',
      test(attributes) {
        for (const attrName in attributes) {
          const attr = attributes[attrName];
          if (attr.type === 'enumeration') {
            const regressedValues = attr.enum.map(toRegressedEnumValue);

            // should match the GraphQL regex
            if (!regressedValues.every(value => GRAPHQL_ENUM_REGEX.test(value))) {
              const message = `Invalid enumervarion value. Values should always have an alphabetical character preceding any number. Update your enumeration '${attrName}'.`;

              return this.createError({ message });
            }

            // should not contain empty values
            if (regressedValues.some(value => value === '')) {
              return this.createError({
                message: `At least one value of the enumeration '${attrName}' appears to be empty.`,
              });
            }

            // should not collide
            const duplicates = _.uniq(
              regressedValues.filter((value, index, values) => values.indexOf(value) !== index)
            );

            if (duplicates.length) {
              const message = `Some enum values of the field '${attrName}' collide when normalized: ${duplicates.join(
                ', '
              )}. Please modify your enumeration.`;

              return this.createError({ message });
            }
          }
        }

        return true;
      },
    }),
  }),
  actions: yup.object().onlyContainsFunctions(),
  lifecycles: yup
    .object()
    .shape(lifecyclesShape)
    .noUnknown(),
});

const validateContentTypeDefinition = data => {
  return contentTypeSchemaValidator.validateSync(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateContentTypeDefinition,
};
