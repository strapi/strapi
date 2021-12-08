'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const validators = require('../common-validators');

const forgotPasswordSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
  })
  .required()
  .noUnknown();

module.exports = validateYupSchema(forgotPasswordSchema);
