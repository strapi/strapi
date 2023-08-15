'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const multiFactorAuthenticationSchema = yup
  .object()
  .shape({
    code: yup.number().integer().required()
  })
  .required()
  .noUnknown();

module.exports = validateYupSchema(multiFactorAuthenticationSchema);
