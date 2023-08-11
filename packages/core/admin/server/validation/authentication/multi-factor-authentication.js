'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const multiFactorAuthenticationSchema = yup
  .object()
  .shape({
    code: yup.number.min(6).max(6).integer().required()
  })
  .required()
  .noUnknown();

module.exports = validateYupSchema(multiFactorAuthenticationSchema);
