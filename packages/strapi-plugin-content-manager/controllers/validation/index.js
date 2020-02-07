'use strict';

const yup = require('yup');
const { formatYupErrors } = require('strapi-utils');

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

module.exports = {
  createModelConfigurationSchema,
  validateKind,
};
