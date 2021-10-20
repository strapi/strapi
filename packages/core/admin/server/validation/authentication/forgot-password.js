'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;
const validators = require('../common-validators');

const handleYupError = error => {
  throw new YupValidationError(error);
};

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
