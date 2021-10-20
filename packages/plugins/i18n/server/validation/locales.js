'use strict';

const { prop } = require('lodash/fp');
const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const { isoLocales } = require('../constants');

const allowedLocaleCodes = isoLocales.map(prop('code'));

const validateSchema = schema => async (body, errorMessage) => {
  try {
    await schema.validate(body, { strict: true, abortEarly: false });
  } catch (e) {
    throw new YupValidationError(e, errorMessage);
  }
};

const createLocaleSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .max(50)
      .nullable(),
    code: yup
      .string()
      .oneOf(allowedLocaleCodes)
      .required(),
    isDefault: yup.boolean().required(),
  })
  .noUnknown();

const updateLocaleSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .max(50)
      .nullable(),
    isDefault: yup.boolean(),
  })
  .noUnknown();

module.exports = {
  validateCreateLocaleInput: validateSchema(createLocaleSchema),
  validateUpdateLocaleInput: validateSchema(updateLocaleSchema),
};
