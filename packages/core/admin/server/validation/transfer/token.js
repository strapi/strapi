'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const constants = require('../../services/constants');

const transferTokenCreationSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).required(),
    description: yup.string().optional(),
    permissions: yup.array().of(yup.string()).nullable(),
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
    permissions: yup.array().of(yup.string()).nullable(),
  })
  .noUnknown()
  .strict();

module.exports = {
  validateTransferTokenCreationInput: validateYupSchema(transferTokenCreationSchema),
  validateTransferTokenUpdateInput: validateYupSchema(transferTokenUpdateSchema),
};
