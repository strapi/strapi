'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const validators = require('../common-validators');

const resetPasswordSchema = yup
  .object()
  .shape({
    resetPasswordToken: yup.string().required(),
    password: validators.password.required(),
  })
  .required()
  .noUnknown();

module.exports = validateYupSchema(resetPasswordSchema);
