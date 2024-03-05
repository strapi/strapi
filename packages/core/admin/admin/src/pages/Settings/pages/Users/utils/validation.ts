import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

/**
 * @description This needs wrapping in `yup.object().shape()` before use.
 */
const COMMON_USER_SCHEMA = {
  firstname: yup.string().trim().required({
    id: translatedErrors.required,
    defaultMessage: 'This field is required',
  }),
  lastname: yup.string(),
  email: yup
    .string()
    .email({
      id: translatedErrors.email,
      defaultMessage: 'This is not a valid email',
    })
    .lowercase()
    .required({
      id: translatedErrors.required,
      defaultMessage: 'This field is required',
    }),
  username: yup
    .string()
    .transform((value) => (value === '' ? undefined : value))
    .nullable(),
  password: yup
    .string()
    .transform((value) => (value === '' ? undefined : value))
    .nullable()
    .min(8, {
      id: translatedErrors.minLength,
      defaultMessage: 'The value is too short (min: {min}).',
      values: { min: 8 },
    })
    .matches(/[a-z]/, {
      id: 'components.Input.error.contain.lowercase',
      defaultMessage: 'Password must contain at least one lowercase character',
    })
    .matches(/[A-Z]/, {
      id: 'components.Input.error.contain.uppercase',
      defaultMessage: 'Password must contain at least one uppercase character',
    })
    .matches(/\d/, {
      id: 'components.Input.error.contain.number',
      defaultMessage: 'Password must contain at least one number',
    }),
  confirmPassword: yup
    .string()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .min(8, {
      id: translatedErrors.minLength,
      defaultMessage: 'The value is too short (min: {min}).',
      values: { min: 8 },
    })
    .oneOf([yup.ref('password'), null], {
      id: 'components.Input.error.password.noMatch',
      defaultMessage: 'Passwords must match',
    })
    .when('password', (password, passSchema) => {
      return password
        ? passSchema.required({
            id: translatedErrors.required,
            defaultMessage: 'This field is required',
          })
        : passSchema;
    }),
};

export { COMMON_USER_SCHEMA };
