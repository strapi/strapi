import { isUndefined } from 'lodash/fp';
import { yup, validateYupSchema } from '@strapi/utils';
import validators from './common-validators';

/** Type for validators to avoid referencing yup internals in emitted .d.ts (pnpm portability) */
type ValidatorFn = (body: unknown, errorMessage?: string) => Promise<unknown>;

const userCreationSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
    firstname: validators.firstname.required(),
    lastname: validators.lastname,
    roles: validators.roles.min(1),
    preferedLanguage: yup.string().nullable(),
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
    ids: yup.array().of(yup.strapiID()).min(1).required(),
  })
  .noUnknown();

export const validateUserCreationInput: ValidatorFn = validateYupSchema(userCreationSchema);
export const validateProfileUpdateInput: ValidatorFn = validateYupSchema(profileUpdateSchema);
export const validateUserUpdateInput: ValidatorFn = validateYupSchema(userUpdateSchema);
export const validateUsersDeleteInput: ValidatorFn = validateYupSchema(usersDeleteSchema);
export const schemas = {
  userCreationSchema,
  usersDeleteSchema,
  userUpdateSchema,
} as Record<string, any>;

export default {
  validateUserCreationInput,
  validateProfileUpdateInput,
  validateUserUpdateInput,
  validateUsersDeleteInput,
  schemas,
} as Record<string, ValidatorFn | Record<string, unknown>>;
