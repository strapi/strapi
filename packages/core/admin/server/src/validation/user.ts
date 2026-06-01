import { isUndefined } from 'lodash/fp';
import { yup, validateYupSchema } from '@strapi/utils';
import { mergeValidatedBody } from '../utils/merge-validated-body';
import validators from './common-validators';

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

export const validateUserCreationInput = validateYupSchema(userCreationSchema);
const normalizeUpdateInput = (input: unknown) => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  const data = { ...input } as Record<string, unknown>;

  if (typeof data.email === 'string') {
    data.email = data.email.toLowerCase();
  }

  if (typeof data.firstname === 'string') {
    data.firstname = data.firstname.trim();
  }

  return data;
};

const runProfileUpdateValidation = validateYupSchema(profileUpdateSchema);
const runUserUpdateValidation = validateYupSchema(userUpdateSchema);

export const validateProfileUpdateInput = async (input: unknown) => {
  const data = normalizeUpdateInput(input);
  const validated = await runProfileUpdateValidation(data);

  return mergeValidatedBody(data as object, validated);
};

export const validateUserUpdateInput = async (input: unknown) => {
  const data = normalizeUpdateInput(input);
  const validated = await runUserUpdateValidation(data);

  return mergeValidatedBody(data as object, validated);
};
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
