'use strict';

const _ = require('lodash');
const yup = require('yup');

const { isValidName, isValidKey } = require('./common');
const { getTypeShape } = require('./types');
const getRelationValidator = require('./relations');

const createSchema = (types, relations, { modelType } = {}) =>
  yup
    .object({
      name: yup
        .string()
        .min(1)
        .required('name.required'),
      description: yup.string(),
      connection: yup.string(),
      collectionName: yup
        .string()
        .nullable()
        .test(isValidName),
      attributes: yup.lazy(attributes => {
        return yup
          .object()
          .shape(
            _.mapValues(attributes, (attribute, key) => {
              if (_.has(attribute, 'type')) {
                const shape = {
                  type: yup
                    .string()
                    .oneOf(types)
                    .required(),
                  ...getTypeShape(attribute, { modelType }),
                };

                return yup
                  .object(shape)
                  .test(isValidKey(key))
                  .noUnknown();
              } else if (_.has(attribute, 'target')) {
                const shape = getRelationValidator(attribute, relations);

                return yup
                  .object(shape)
                  .test(isValidKey(key))
                  .noUnknown();
              }
              return yup.object().test({
                name: 'mustHaveTypeOrTarget',
                message: 'Attribute must have either a type or a target',
                test: () => false,
              });
            })
          )
          .required('attributes.required');
      }),
    })
    .noUnknown();

module.exports = createSchema;
