import { yup, validateYupSchema } from '@strapi/utils';
import validators from '../common-validators';

type ValidatorFn = (body: unknown, errorMessage?: string) => Promise<unknown>;

const registrationSchema = yup
  .object()
  .shape({
    registrationToken: yup.string().required(),
    userInfo: yup
      .object()
      .shape({
        firstname: validators.firstname.required(),
        lastname: validators.lastname.nullable(),
        password: validators.password.required(),
      })
      .required()
      .noUnknown(),
    deviceId: yup.string().uuid().optional(),
    rememberMe: yup.boolean().optional(),
  })
  .noUnknown();

const registrationInfoQuerySchema = yup
  .object()
  .shape({
    registrationToken: yup.string().required(),
  })
  .required()
  .noUnknown();

const adminRegistrationSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
    firstname: validators.firstname.required(),
    lastname: validators.lastname.nullable(),
    password: validators.password.required(),
    deviceId: yup.string().uuid().optional(),
    rememberMe: yup.boolean().optional(),
  })
  .required()
  .noUnknown();

export const validateRegistrationInput: ValidatorFn = validateYupSchema(registrationSchema);
export const validateRegistrationInfoQuery: ValidatorFn = validateYupSchema(
  registrationInfoQuerySchema
);
export const validateAdminRegistrationInput: ValidatorFn =
  validateYupSchema(adminRegistrationSchema);

export default {
  validateRegistrationInput,
  validateRegistrationInfoQuery,
  validateAdminRegistrationInput,
} as Record<string, ValidatorFn>;
