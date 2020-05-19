'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const registrationSchema = yup
  .object()
  .shape({
    registrationToken: yup.string().required(),
    userInfo: yup
      .object()
      .shape({
        firstname: yup
          .string()
          .min(1)
          .required(),
        lastname: yup
          .string()
          .min(1)
          .required(),
        password: yup
          .string()
          .min(8)
          .matches(/[a-z]/, '${path} must contain at least one lowercase character')
          .matches(/[A-Z]/, '${path} must contain at least one uppercase character')
          .matches(/\d/, '${path} must contain at least one number')
          .required(),
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

module.exports = {
  validateRegistrationInput,
  validateRegistrationInfoQuery,
};
