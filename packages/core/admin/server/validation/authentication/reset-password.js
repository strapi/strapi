'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;
const validators = require('../common-validators');

const handleYupError = error => {
  throw new YupValidationError(error);
};

const resetPasswordSchema = yup
  .object()
  .shape({
    resetPasswordToken: yup.string().required(),
    password: validators.password.required(),
  })
  .required()
  .noUnknown();

const validateResetPasswordInput = data => {
  return resetPasswordSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

module.exports = validateResetPasswordInput;
