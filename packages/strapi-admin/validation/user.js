'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('./common-validators');

const handleReject = error => Promise.reject(formatYupErrors(error));

const userCreationSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
    firstname: validators.firstname.required(),
    lastname: validators.lastname.required(),
    roles: validators.roles, // FIXME: set min to 1 once the create  role API is created,
  })
  .noUnknown();

const validateUserCreationInput = data => {
  return userCreationSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

const profileUpdateSchema = yup
  .object()
  .shape({
    email: validators.email,
    firstname: validators.firstname,
    lastname: validators.lastname,
    username: validators.username.nullable(),
    password: validators.password,
  })
  .noUnknown();

const validateProfileUpdateInput = data => {
  return profileUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

const userUpdateSchema = yup
  .object()
  .shape({
    email: validators.email,
    firstname: validators.firstname,
    lastname: validators.lastname,
    username: validators.username.nullable(),
    password: validators.password,
    isActive: yup.bool(),
    roles: validators.roles.min(1),
  })
  .noUnknown();

const validateUserUpdateInput = data => {
  return userUpdateSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

module.exports = {
  validateUserCreationInput,
  validateProfileUpdateInput,
  validateUserUpdateInput,
};
