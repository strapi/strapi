'use strict';

const _ = require('lodash');
const yup = require('yup');

const { modelTypes, FORBIDDEN_ATTRIBUTE_NAMES, typeKinds } = require('./constants');
const { isValidCollectionName, isValidKey } = require('./common');
const getTypeValidator = require('./types');
const getRelationValidator = require('./relations');

const createSchema = (types, relations, { modelType } = {}) => {
  const shape = {
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
    attributes: createAttributesValidator({ types, relations, modelType }),
  };

  if (modelType === modelTypes.CONTENT_TYPE) {
    shape.kind = yup
      .string()
      .oneOf([typeKinds.SINGLE_TYPE, typeKinds.COLLECTION_TYPE])
      .nullable();
  }

  return yup.object(shape).noUnknown();
};

const createAttributesValidator = ({ types, modelType, relations }) => {
  return yup.lazy(attributes => {
    return yup
      .object()
      .shape(
        _.mapValues(attributes, (attribute, key) => {
          if (isForbiddenKey(key)) {
            return forbiddenValidator;
          }

          if (_.has(attribute, 'type')) {
            return getTypeValidator(attribute, { types, modelType, attributes })
              .test(isValidKey(key))
              .noUnknown();
          }

          if (_.has(attribute, 'target')) {
            return yup
              .object(getRelationValidator(attribute, relations))
              .test(isValidKey(key))
              .noUnknown();
          }

          return typeOrRelationValidator;
        })
      )
      .required('attributes.required');
  });
};

const isForbiddenKey = key => FORBIDDEN_ATTRIBUTE_NAMES.includes(key);

const forbiddenValidator = yup.object().test({
  name: 'forbiddenKeys',
  message: `Attribute keys cannot be one of ${FORBIDDEN_ATTRIBUTE_NAMES.join(', ')}`,
  test: () => false,
});

const typeOrRelationValidator = yup.object().test({
  name: 'mustHaveTypeOrTarget',
  message: 'Attribute must have either a type or a target',
  test: () => false,
});

module.exports = createSchema;
