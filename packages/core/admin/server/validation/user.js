'use strict';

const { isUndefined } = require('lodash/fp');
const { yup, formatYupErrors } = require('@strapi/utils');
const validators = require('./common-validators');

const handleReject = error => Promise.reject(formatYupErrors(error));

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
  return userCreationSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

const profileUpdateSchema = yup
  .object()
  .shape({
    // @ts-ignore
    email: validators.email.notNull(),
    // @ts-ignore
    firstname: validators.firstname.notNull(),
    // @ts-ignore
    lastname: validators.lastname.notNull(),
    // @ts-ignore
    username: validators.username.nullable(),
    // @ts-ignore
    password: validators.password.notNull(),
    currentPassword: yup
      .string()
      .when('password', (password, schema) => (!isUndefined(password) ? schema.required() : schema))
      // @ts-ignore
      .notNull(),
    preferedLanguage: yup.string().nullable(),
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
    // @ts-ignore
    email: validators.email.notNull(),
    // @ts-ignore
    firstname: validators.firstname.notNull(),
    // @ts-ignore
    lastname: validators.lastname.notNull(),
    // @ts-ignore
    username: validators.username.nullable(),
    // @ts-ignore
    password: validators.password.notNull(),
    // @ts-ignore
    isActive: yup.bool().notNull(),
    // @ts-ignore
    roles: validators.roles.min(1).notNull(),
  })
  .noUnknown();

const validateUserUpdateInput = data => {
  return userUpdateSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

const usersDeleteSchema = yup
  .object()
  .shape({
    ids: yup
      .array()
      // @ts-ignore
      .of(yup.strapiID())
      .min(1)
      .required(),
  })
  .noUnknown();

const validateUsersDeleteInput = async data => {
  return usersDeleteSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
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
