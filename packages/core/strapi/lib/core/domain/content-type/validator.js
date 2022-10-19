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

/**
 * For enumerations the least common denomiator is GraphQL, where
 * values needs to match the secure name regex:
 * GraphQL Spec https://spec.graphql.org/June2018/#sec-Names
 *
 * Therefore we need to make sure our users only use values, which
 * can be returned by GraphQL, by checking the regressed values
 * agains the GraphQL regex.
 *
 * TODO V5: check if we can avoid this coupling by moving this logic
 * into the GraphQL plugin.
 */
const GRAPHQL_ENUM_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/;

const lifecyclesShape = _.mapValues(_.keyBy(LIFECYCLES), () => yup.mixed().nullable().isFunction());

const contentTypeSchemaValidator = yup.object().shape({
  schema: yup.object().shape({
    info: yup
      .object()
      .shape({
        displayName: yup.string().required(),
        singularName: yup.string().isKebabCase().required(),
        pluralName: yup.string().isKebabCase().required(),
      })
      .required(),
    attributes: yup.object().test({
      name: 'valuesCollide',
      message: 'Some values collide when normalized',
      test(attributes) {
        for (const attrName of Object.keys(attributes)) {
          const attr = attributes[attrName];
          if (attr.type === 'enumeration') {
            const regressedValues = attr.enum.map(toRegressedEnumValue);

            // should match the GraphQL regex
            if (!regressedValues.every((value) => GRAPHQL_ENUM_REGEX.test(value))) {
              const message = `Invalid enumeration value. Values should have at least one alphabetical character preceeding the first occurence of a number. Update your enumeration '${attrName}'.`;

              return this.createError({ message });
            }

            // should not contain empty values
            if (regressedValues.some((value) => value === '')) {
              return this.createError({
                message: `At least one value of the enumeration '${attrName}' appears to be empty. Only alphanumerical characters are taken into account.`,
              });
            }

            // should not collide
            const duplicates = _.uniq(
              regressedValues.filter((value, index, values) => values.indexOf(value) !== index)
            );

            if (duplicates.length) {
              const message = `Some enumeration values of the field '${attrName}' collide when normalized: ${duplicates.join(
                ', '
              )}. Please modify your enumeration.`;

              return this.createError({ message });
            }
          }
        }

        return true;
      },
    }).test({
      name: 'uniqueAttributeNames',
      message: 'Attribute names must be unique',
      test(attributes) {
        const attributeNames = Object.keys(attributes);
        const duplicates = _.uniq(attributeNames.map((name) => name.toLocaleLowerCase()).filter((name, index, names) => names.indexOf(name) !== index));
        if (duplicates.length) {
          const message = `Attribute names must be unique. The following attributes are duplicated: ${duplicates.join(
            ', '
          )}`;
          return this.createError({ message });
        }
        return true;
      },
    }),
  }),
  actions: yup.object().onlyContainsFunctions(),
  lifecycles: yup.object().shape(lifecyclesShape).noUnknown(),
});

const validateContentTypeDefinition = (data) => {
  return contentTypeSchemaValidator.validateSync(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateContentTypeDefinition,
};
