'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

const userCreationSchema = yup
  .object()
  .shape({
    email: yup
      .string()
      .email()
      .required(),
    firstname: yup
      .string()
      .min(1)
      .required(),
    lastname: yup
      .string()
      .min(1)
      .required(),
    roles: yup.array(), // FIXME: set min to 1 once the create  role API is created,
  })
  .noUnknown();

const validateUserCreationInput = data => {
  return userCreationSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

module.exports = {
  validateUserCreationInput,
};
