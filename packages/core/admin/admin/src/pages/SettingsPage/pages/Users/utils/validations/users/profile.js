import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

export const commonUserSchema = {
  firstname: yup.mixed().required(translatedErrors.required),
  lastname: yup.mixed(),
  email: yup
    .string()
    .email(translatedErrors.email)
    .lowercase()
    .required(translatedErrors.required),
  username: yup.string().nullable(),
  password: yup
    .string()
    .min(8, translatedErrors.minLength)
    .matches(/[a-z]/, 'components.Input.error.contain.lowercase')
    .matches(/[A-Z]/, 'components.Input.error.contain.uppercase')
    .matches(/\d/, 'components.Input.error.contain.number'),
  confirmPassword: yup
    .string()
    .min(8, translatedErrors.minLength)
    .oneOf([yup.ref('password'), null], 'components.Input.error.password.noMatch')
    .when('password', (password, passSchema) => {
      return password ? passSchema.required(translatedErrors.required) : passSchema;
    }),
};

const schema = {
  ...commonUserSchema,
  currentPassword: yup
    .string()
    .when(['password', 'confirmPassword'], (password, confirmPassword, passSchema) => {
      return password || confirmPassword
        ? passSchema.required(translatedErrors.required)
        : passSchema;
    }),
  preferedLanguage: yup.string().nullable(),
};

export default schema;
