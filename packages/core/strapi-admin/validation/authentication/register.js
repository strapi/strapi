'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('../common-validators');

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
    .catch(error => Promise.reject(formatYupErrors(error)));
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
    .catch(error => Promise.reject(formatYupErrors(error)));
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
    .catch(error => Promise.reject(formatYupErrors(error)));
};

module.exports = {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
};
