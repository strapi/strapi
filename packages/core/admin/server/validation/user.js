'use strict';

const { isUndefined } = require('lodash/fp');
const { yup, validateYupSchema } = require('@strapi/utils');
const validators = require('./common-validators');

const userCreationSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
    firstname: validators.firstname.required(),
    lastname: validators.lastname,
    roles: validators.roles.min(1),
    preferredLanguage: yup.string().nullable(),
  })
  .noUnknown();

const profileUpdateSchema = yup
  .object()
  .shape({
    email: validators.email.notNull(),
    firstname: validators.firstname.notNull(),
    lastname: validators.lastname.nullable(),
    username: validators.username.nullable(),
    password: validators.password.notNull(),
    currentPassword: yup
      .string()
      .when('password', (password, schema) => (!isUndefined(password) ? schema.required() : schema))
      .notNull(),
    preferredLanguage: yup.string().nullable(),
  })
  .noUnknown();

const userUpdateSchema = yup
  .object()
  .shape({
    email: validators.email.notNull(),
    firstname: validators.firstname.notNull(),
    lastname: validators.lastname.nullable(),
    username: validators.username.nullable(),
    password: validators.password.notNull(),
    isActive: yup.bool().notNull(),
    roles: validators.roles.min(1).notNull(),
  })
  .noUnknown();

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

module.exports = {
  validateUserCreationInput: validateYupSchema(userCreationSchema),
  validateProfileUpdateInput: validateYupSchema(profileUpdateSchema),
  validateUserUpdateInput: validateYupSchema(userUpdateSchema),
  validateUsersDeleteInput: validateYupSchema(usersDeleteSchema),

  schemas: {
    userCreationSchema,
    usersDeleteSchema,
    userUpdateSchema,
  },
};
