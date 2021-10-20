'use strict';

const _ = require('lodash');
const { yup } = require('@strapi/utils');
const { PaginationError, ValidationError, YupValidationError } = require('@strapi/utils').errors;

const createModelConfigurationSchema = require('./model-configuration');

const TYPES = ['singleType', 'collectionType'];

const handleYupError = error => {
  throw new YupValidationError(error);
};

/**
 * Validates type kind
 */
const validateKind = kind => {
  return yup
    .string()
    .oneOf(TYPES)
    .nullable()
    .validate(kind)
    .catch(error => Promise.reject(handleYupError(error)));
};

const validateBulkDeleteInput = (data = {}) => {
  return yup
    .object({
      ids: yup
        .array()
        .of(yup.strapiID())
        .min(1)
        .required(),
    })
    .required()
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(handleYupError);
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
    .catch(handleYupError);
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
    .catch(handleYupError);
};

const validateUIDField = (contentTypeUID, field) => {
  const model = strapi.contentTypes[contentTypeUID];

  if (!model) {
    throw new ValidationError('ContentType not found');
  }

  if (
    !_.has(model, ['attributes', field]) ||
    _.get(model, ['attributes', field, 'type']) !== 'uid'
  ) {
    throw new ValidationError(`${field} must be a valid \`uid\` attribute`);
  }
};

const validatePagination = ({ page, pageSize }) => {
  const pageNumber = parseInt(page);
  const pageSizeNumber = parseInt(pageSize);

  if (isNaN(pageNumber) || pageNumber < 1) {
    throw new PaginationError('invalid pageNumber param');
  }
  if (isNaN(pageSizeNumber) || pageSizeNumber < 1) {
    throw new PaginationError('invalid pageSize param');
  }
};

module.exports = {
  createModelConfigurationSchema,
  validateKind,
  validateBulkDeleteInput,
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
  validatePagination,
};
