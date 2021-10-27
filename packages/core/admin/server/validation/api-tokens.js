'use strict';

const { yup, handleYupError } = require('@strapi/utils');
const constants = require('../services/constants');

const apiTokenCreationSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .required(),
    description: yup.string().optional(),
    type: yup
      .string()
      .oneOf(Object.values(constants.API_TOKEN_TYPE))
      .required(),
  })
  .noUnknown();

const validateApiTokenCreationInput = async data => {
  return apiTokenCreationSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

const apiTokenUpdateSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .notNull(),
    description: yup.string().nullable(),
    type: yup
      .string()
      .oneOf(Object.values(constants.API_TOKEN_TYPE))
      .notNull(),
  })
  .noUnknown();

const validateApiTokenUpdateInput = async data => {
  return apiTokenUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

module.exports = {
  validateApiTokenCreationInput,
  validateApiTokenUpdateInput,
};
