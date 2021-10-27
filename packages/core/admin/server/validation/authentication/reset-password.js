'use strict';

const { yup, handleYupError } = require('@strapi/utils');
const validators = require('../common-validators');

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
