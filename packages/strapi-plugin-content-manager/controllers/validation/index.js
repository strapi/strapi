'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');

const createModelConfigurationSchema = require('./model-configuration');

const TYPES = ['singleType', 'collectionType'];

/**
 * Validates type kind
 */
const validateKind = kind => {
  return yup
    .string()
    .oneOf(TYPES)
    .nullable()
    .validate(kind)
    .catch(error => Promise.reject(formatYupErrors(error)));
};

const validateGenerateUIDInput = data => {
  return yup
    .object({
      contentTypeUID: yup.string().required(),
      field: yup.string().required(),
      data: yup.object().required(),
    })
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => {
      throw strapi.errors.badRequest('ValidationError', formatYupErrors(error));
    });
};

const validateCheckUIDAvailabilityInput = data => {
  return yup
    .object({
      contentTypeUID: yup.string().required(),
      field: yup.string().required(),
      value: yup
        .string()
        .matches(new RegExp('^[A-Za-z0-9-_.~]*$'))
        .required(),
    })
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => {
      throw strapi.errors.badRequest('ValidationError', formatYupErrors(error));
    });
};

const validateUIDField = (contentTypeUID, field) => {
  const model = strapi.contentTypes[contentTypeUID];

  if (!model) {
    throw strapi.errors.badRequest('ValidationError', ['ContentType not found']);
  }

  if (
    !_.has(model, ['attributes', field]) ||
    _.get(model, ['attributes', field, 'type']) !== 'uid'
  ) {
    throw strapi.errors.badRequest('ValidationError', {
      field: ['field must be a valid `uid` attribute'],
    });
  }
};

module.exports = {
  createModelConfigurationSchema,
  validateKind,
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
};
