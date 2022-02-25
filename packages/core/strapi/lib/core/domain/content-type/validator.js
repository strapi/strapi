'use strict';

const _ = require('lodash');
const { yup, toRegressedEnumValue, startsWithANumber } = require('@strapi/utils');

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
            // should not start by a number
            if (attr.enum.some(startsWithANumber)) {
              const message = `Enum values should not start with a number. Please modify your enumeration '${attrName}'.`;

              return this.createError({ message });
            }

            // should not collide
            const duplicates = _.uniq(
              attr.enum
                .map(toRegressedEnumValue)
                .filter((value, index, values) => values.indexOf(value) !== index)
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
