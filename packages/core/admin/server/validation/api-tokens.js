'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const constants = require('../services/constants');

const apiTokenCreationSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).required(),
    description: yup.string().optional(),
    type: yup.string().oneOf(Object.values(constants.API_TOKEN_TYPE)).required(),
  })
  .noUnknown();

const apiTokenUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).notNull(),
    description: yup.string().nullable(),
    type: yup.string().oneOf(Object.values(constants.API_TOKEN_TYPE)).notNull(),
  })
  .noUnknown();

module.exports = {
  validateApiTokenCreationInput: validateYupSchema(apiTokenCreationSchema),
  validateApiTokenUpdateInput: validateYupSchema(apiTokenUpdateSchema),
};
