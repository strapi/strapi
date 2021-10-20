'use strict';

const { isUndefined } = require('lodash/fp');
const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;
const validators = require('./common-validators');

const handleYupError = error => {
  throw new YupValidationError(error);
};

const userCreationSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
    firstname: validators.firstname.required(),
    lastname: validators.lastname.required(),
    roles: validators.roles.min(1),
    preferedLanguage: yup.string().nullable(),
  })
  .noUnknown();

const validateUserCreationInput = data => {
  return userCreationSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

const profileUpdateSchema = yup
  .object()
  .shape({
    email: validators.email.notNull(),
    firstname: validators.firstname.notNull(),
    lastname: validators.lastname.notNull(),
    username: validators.username.nullable(),
    password: validators.password.notNull(),
    currentPassword: yup
      .string()
      .when('password', (password, schema) => (!isUndefined(password) ? schema.required() : schema))
      .notNull(),
    preferedLanguage: yup.string().nullable(),
  })
  .noUnknown();

const validateProfileUpdateInput = data => {
  return profileUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

const userUpdateSchema = yup
  .object()
  .shape({
    email: validators.email.notNull(),
    firstname: validators.firstname.notNull(),
    lastname: validators.lastname.notNull(),
    username: validators.username.nullable(),
    password: validators.password.notNull(),
    isActive: yup.bool().notNull(),
    roles: validators.roles.min(1).notNull(),
  })
  .noUnknown();

const validateUserUpdateInput = data => {
  return userUpdateSchema.validate(data, { strict: true, abortEarly: false }).catch(handleYupError);
};

const usersDeleteSchema = yup
  .object()
  .shape({
    ids: yup
      .array()
      .of(yup.strapiID())
      .min(1)
      .required(),
  })
  .noUnknown();

const validateUsersDeleteInput = async data => {
  return usersDeleteSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

module.exports = {
  validateUserCreationInput,
  validateProfileUpdateInput,
  validateUserUpdateInput,
  validateUsersDeleteInput,

  schemas: {
    userCreationSchema,
    usersDeleteSchema,
    userUpdateSchema,
  },
};
