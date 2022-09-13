'use strict';

const { prop } = require('lodash/fp');
const { yup, validateYupSchema } = require('@strapi/utils');

const { isoLocales } = require('../constants');

const allowedLocaleCodes = isoLocales.map(prop('code'));

const createLocaleSchema = yup
  .object()
  .shape({
    name: yup.string().max(50).nullable(),
    code: yup.string().oneOf(allowedLocaleCodes).required(),
    isDefault: yup.boolean().required(),
  })
  .noUnknown();

const updateLocaleSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).max(50).nullable(),
    isDefault: yup.boolean(),
  })
  .noUnknown();

module.exports = {
  validateCreateLocaleInput: validateYupSchema(createLocaleSchema),
  validateUpdateLocaleInput: validateYupSchema(updateLocaleSchema),
};
