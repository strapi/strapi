'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const constants = require('../../services/constants');

const transferTokenCreationSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).required(),
    description: yup.string().optional(),
    permissions: yup
      .array()
      .min(1)
      .of(yup.string().oneOf(Object.values(constants.TRANSFER_TOKEN_TYPE)))
      .required(),
    lifespan: yup
      .number()
      .min(1)
      .oneOf(Object.values(constants.TRANSFER_TOKEN_LIFESPANS))
      .nullable(),
  })
  .noUnknown()
  .strict();

const transferTokenUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).notNull(),
    description: yup.string().nullable(),
    permissions: yup
      .array()
      .min(1)
      .of(yup.string().oneOf(Object.values(constants.TRANSFER_TOKEN_TYPE)))
      .nullable(),
  })
  .noUnknown()
  .strict();

module.exports = {
  validateTransferTokenCreationInput: validateYupSchema(transferTokenCreationSchema),
  validateTransferTokenUpdateInput: validateYupSchema(transferTokenUpdateSchema),
};
