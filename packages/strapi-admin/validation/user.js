'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('./common-validators');

const handleReject = error => Promise.reject(formatYupErrors(error));

const userCreationSchema = yup
  .object()
  .shape({
    email: yup
      .string()
      .email()
      .required(),
    firstname: validators.firstname,
    lastname: validators.lastname,
    roles: yup.array(), // FIXME: set min to 1 once the create  role API is created,
  })
  .noUnknown();

const validateUserCreationInput = data => {
  return userCreationSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

const profileUpdateSchema = yup
  .object()
  .shape({
    email: yup
      .string()
      .email()
      .required(),
    firstname: validators.firstname,
    lastname: validators.lastname,
    username: yup.string().min(1),
    password: validators.password,
  })
  .noUnknown();

const validateProfileUpdateInput = data => {
  return profileUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validateUserCreationInput,
  validateProfileUpdateInput,
};
