'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;
const validators = require('../common-validators');

const handleYupError = error => {
  throw new YupValidationError(error);
};

const registrationSchema = yup
  .object()
  .shape({
    registrationToken: yup.string().required(),
    userInfo: yup
      .object()
      .shape({
        firstname: validators.firstname.required(),
        lastname: validators.lastname.required(),
        password: validators.password.required(),
      })
      .required()
      .noUnknown(),
  })
  .noUnknown();

const validateRegistrationInput = data => {
  return registrationSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

const registrationInfoQuerySchema = yup
  .object()
  .shape({
    registrationToken: yup.string().required(),
  })
  .required()
  .noUnknown();

const validateRegistrationInfoQuery = query => {
  return registrationInfoQuerySchema
    .validate(query, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

const adminRegistrationSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
    firstname: validators.firstname.required(),
    lastname: validators.lastname.required(),
    password: validators.password.required(),
  })
  .required()
  .noUnknown();

const validateAdminRegistrationInput = data => {
  return adminRegistrationSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

module.exports = {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
};
