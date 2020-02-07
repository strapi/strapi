'use strict';

const _ = require('lodash');
const yup = require('yup');
const { formatYupErrors } = require('strapi-utils');

const createSchema = require('./model-schema');
const removeEmptyDefaults = require('./remove-empty-defaults');
const { nestedComponentSchema } = require('./component');
const { modelTypes, DEFAULT_TYPES, typeKinds } = require('./constants');

/**
 * Allowed relation per type kind
 */
const VALID_RELATIONS = {
  [typeKinds.SINGLE_TYPE]: ['oneWay', 'manyWay'],
  [typeKinds.COLLECTION_TYPE]: [
    'oneWay',
    'manyWay',
    'oneToOne',
    'oneToMany',
    'manyToOne',
    'manyToMany',
  ],
};

/**
 * Allowed types
 */
const VALID_TYPES = [...DEFAULT_TYPES, 'component', 'dynamiczone'];

/**
 * Returns a yup schema to validate a content type payload
 * @param {Object} data payload
 */
const createContentTypeSchema = data => {
  const kind = _.get(data, 'kind', typeKinds.COLLECTION_TYPE);

  const contentTypeSchema = createSchema(
    VALID_TYPES,
    VALID_RELATIONS[kind] || [],
    {
      modelType: modelTypes.CONTENT_TYPE,
    }
  );

  return yup
    .object({
      contentType: contentTypeSchema.required().noUnknown(),
      components: nestedComponentSchema,
    })
    .noUnknown();
};

/**
 * Validator for content type creation
 */
const validateContentTypeInput = data => {
  return createContentTypeSchema(data)
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

/**
 * Validator for content type edition
 */
const validateUpdateContentTypeInput = data => {
  removeEmptyDefaults(data);

  return createContentTypeSchema(data)
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

/**
 * Validates type kind
 */
const validateKind = kind => {
  return yup
    .string()
    .oneOf([typeKinds.SINGLE_TYPE, typeKinds.COLLECTION_TYPE])
    .nullable()
    .validate(kind)
    .catch(error => Promise.reject(formatYupErrors(error)));
};

module.exports = {
  validateContentTypeInput,
  validateUpdateContentTypeInput,
  validateKind,
};
