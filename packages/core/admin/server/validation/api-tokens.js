'use strict';

const { yup, formatYupErrors } = require('@strapi/utils');
const constants = require('../services/constants');

const handleReject = error => Promise.reject(formatYupErrors(error));

const apiTokenCreationSchema = yup
  .object()
  .shape({
    id: yup
      .number()
      .min(1)
      .notNull(),
    name: yup
      .string()
      .min(1)
      .notNull(),
    description: yup.string().nullable(),
    type: yup
      .string()
      .oneOf(Object.values(constants.API_TOKEN_TYPE))
      .notNull(),
    createdAt: yup
      .string()
      .min(1)
      .notNull(),
    accessKey: yup
      .string()
      .min(1)
      .notNull(),
  })
  .noUnknown();

const validateApiTokenCreationInput = async data => {
  return apiTokenCreationSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

const apiTokenUpdateSchema = yup
  .object()
  .shape({
    id: yup
      .number()
      .min(1)
      .notNull(),
    name: yup
      .string()
      .min(1)
      .notNull(),
    description: yup.string().nullable(),
    type: yup
      .string()
      .oneOf(Object.values(constants.API_TOKEN_TYPE))
      .notNull(),
    createdAt: yup
      .string()
      .min(1)
      .notNull(),
    accessKey: yup
      .string()
      .min(1)
      .notNull(),
  })
  .noUnknown();

const validateApiTokenUpdateInput = async data => {
  return apiTokenUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validateApiTokenCreationInput,
  validateApiTokenUpdateInput,
};
