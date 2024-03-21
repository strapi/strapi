import { isUndefined } from 'lodash/fp';
import * as yup from 'yup';
import { validators, validateYupSchema } from '@strapi/utils';
import commonValidators from './common-validators';

const userCreationSchema = yup
  .object()
  .shape({
    email: commonValidators.email.required(),
    firstname: commonValidators.firstname.required(),
    lastname: commonValidators.lastname,
    roles: commonValidators.roles.min(1),
    preferedLanguage: yup.string().nullable(),
  })
  .noUnknown();

const profileUpdateSchema = yup
  .object()
  .shape({
    email: commonValidators.email.notNull(),
    firstname: commonValidators.firstname.notNull(),
    lastname: commonValidators.lastname.nullable(),
    username: commonValidators.username.nullable(),
    password: commonValidators.password.notNull(),
    currentPassword: yup
      .string()
      .when('password', (password: string, schema: any) =>
        !isUndefined(password) ? schema.required() : schema
      )
      .notNull(),
    preferedLanguage: yup.string().nullable(),
  })
  .noUnknown();

const userUpdateSchema = yup
  .object()
  .shape({
    email: commonValidators.email.notNull(),
    firstname: commonValidators.firstname.notNull(),
    lastname: commonValidators.lastname.nullable(),
    username: commonValidators.username.nullable(),
    password: commonValidators.password.notNull(),
    isActive: yup.bool().notNull(),
    roles: commonValidators.roles.min(1).notNull(),
  })
  .noUnknown();

const usersDeleteSchema = yup
  .object()
  .shape({
    ids: yup.array().of(validators.strapiID()).min(1).required(),
  })
  .noUnknown();

export const validateUserCreationInput = validateYupSchema(userCreationSchema);
export const validateProfileUpdateInput = validateYupSchema(profileUpdateSchema);
export const validateUserUpdateInput = validateYupSchema(userUpdateSchema);
export const validateUsersDeleteInput = validateYupSchema(usersDeleteSchema);
export const schemas = {
  userCreationSchema,
  usersDeleteSchema,
  userUpdateSchema,
};

export default {
  validateUserCreationInput,
  validateProfileUpdateInput,
  validateUserUpdateInput,
  validateUsersDeleteInput,
  schemas,
};
