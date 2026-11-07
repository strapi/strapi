import * as yup from 'yup';

import { translatedErrors } from '../../../../../utils/translatedErrors';

import type { PasswordSchema } from '../../../../../utils/passwordPolicy';

/**
 * @description This needs wrapping in `yup.object().shape()` before use. The password rules come
 * from the configurable password policy, see `usePasswordPolicy`.
 */
const createCommonUserSchema = (passwordSchema: PasswordSchema) => ({
  firstname: yup.string().trim().required({
    id: translatedErrors.required.id,
    defaultMessage: 'This field is required',
  }),
  lastname: yup.string().nullable(),
  email: yup.string().email(translatedErrors.email).lowercase().required({
    id: translatedErrors.required.id,
    defaultMessage: 'This field is required',
  }),
  username: yup
    .string()
    .transform((value) => (value === '' ? undefined : value))
    .nullable(),
  password: passwordSchema
    .transform((value) => (value === '' || value === null ? undefined : value))
    .nullable(),
  confirmPassword: yup
    .string()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .oneOf([yup.ref('password'), null], {
      id: 'components.Input.error.password.noMatch',
      defaultMessage: 'Passwords must match',
    })
    .when('password', (password, passSchema) => {
      return password
        ? passSchema
            .required({
              id: translatedErrors.required.id,
              defaultMessage: 'This field is required',
            })
            .nullable()
        : passSchema;
    }),
});

export { createCommonUserSchema };
