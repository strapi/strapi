'use strict';

const { yup, handleYupError } = require('@strapi/utils');
const validators = require('../common-validators');

const forgotPasswordSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
  })
  .required()
  .noUnknown();

const validateForgotPasswordInput = data => {
  return forgotPasswordSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

module.exports = validateForgotPasswordInput;
