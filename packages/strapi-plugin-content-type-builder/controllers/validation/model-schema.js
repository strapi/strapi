'use strict';

const _ = require('lodash');
const yup = require('yup');

const { modelTypes, FORBIDDEN_ATTRIBUTE_NAMES, typeKinds } = require('../../services/constants');
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
    draftAndPublish: yup.boolean(),
    pluginOptions: yup.object(),
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
            return forbiddenValidator();
          }

          if (_.has(attribute, 'type')) {
            return getTypeValidator(attribute, { types, modelType, attributes }).test(
              isValidKey(key)
            );
          }

          if (_.has(attribute, 'target')) {
            return yup.object(getRelationValidator(attribute, relations)).test(isValidKey(key));
          }

          return typeOrRelationValidator;
        })
      )
      .required('attributes.required');
  });
};

const isForbiddenKey = key => {
  return [
    ...FORBIDDEN_ATTRIBUTE_NAMES,
    ...strapi.plugins['content-type-builder'].services.builder.getReservedNames().attributes,
  ].includes(key);
};

const forbiddenValidator = () => {
  const reservedNames = [
    ...FORBIDDEN_ATTRIBUTE_NAMES,
    ...strapi.plugins['content-type-builder'].services.builder.getReservedNames().attributes,
  ];

  return yup.mixed().test({
    name: 'forbiddenKeys',
    message: `Attribute keys cannot be one of ${reservedNames.join(', ')}`,
    test: () => false,
  });
};

const typeOrRelationValidator = yup.object().test({
  name: 'mustHaveTypeOrTarget',
  message: 'Attribute must have either a type or a target',
  test: () => false,
});

module.exports = createSchema;
