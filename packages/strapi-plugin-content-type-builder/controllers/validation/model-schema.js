'use strict';

const _ = require('lodash');
const yup = require('yup');

const {
  modelTypes,
  FORBIDDEN_ATTRIBUTE_NAMES,
  CONTENT_TYPE_KINDS,
} = require('./constants');
const { isValidCollectionName, isValidKey } = require('./common');
const { getTypeShape } = require('./types');
const getRelationValidator = require('./relations');

const createSchema = (types, relations, { modelType } = {}) => {
  const schema = yup.object({
    name: yup
      .string()
      .min(1)
      .required('name.required'),
    description: yup.string(),
    connection: yup.string(),
    collectionName: yup
      .string()
      .nullable()
      .test(isValidCollectionName),
    attributes: yup.lazy(attributes => {
      return yup
        .object()
        .shape(
          _.mapValues(attributes, (attribute, key) => {
            if (FORBIDDEN_ATTRIBUTE_NAMES.includes(key)) {
              return yup.object().test({
                name: 'forbiddenKeys',
                message: `Attribute keys cannot be one of ${FORBIDDEN_ATTRIBUTE_NAMES.join(
                  ', '
                )}`,
                test: () => false,
              });
            }

            if (_.has(attribute, 'type')) {
              const shape = {
                type: yup
                  .string()
                  .oneOf(types)
                  .required(),
                configurable: yup.boolean().nullable(),
                private: yup.boolean().nullable(),
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
  });

  if (modelType === modelTypes.CONTENT_TYPE) {
    return schema
      .shape({
        kind: yup
          .string()
          .oneOf(CONTENT_TYPE_KINDS)
          .required('contentType.kind.required'),
      })
      .noUnknown();
  }

  return schema.noUnknown();
};

module.exports = createSchema;
