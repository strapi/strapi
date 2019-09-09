import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';

const form = {
  'forgot-password': {
    endPoint: 'forgot-password',
    inputs: [
      [
        {
          label: {
            id: 'Auth.form.forgot-password.email.label',
          },
          name: 'email',
          type: 'email',
          placeholder: 'Auth.form.forgot-password.email.placeholder',
        },
      ],
    ],
    schema: yup.object({
      email: yup
        .string()
        .email(translatedErrors.email)
        .required(translatedErrors.required),
    }),
  },
  login: {
    endPoint: 'local',
    inputs: [
      [
        {
          label: {
            id: 'Auth.form.login.username.label',
          },
          name: 'identifier',
          type: 'text',
          placeholder: 'Auth.form.login.username.placeholder',
        },
      ],
      [
        {
          label: {
            id: 'Auth.form.login.password.label',
          },
          name: 'password',
          type: 'password',
        },
      ],
      [
        {
          customBootstrapClass: 'col-6',
          label: {
            id: 'Auth.form.login.rememberMe.label',
          },
          name: 'rememberMe',
          type: 'checkbox',
        },
      ],
    ],
    schema: yup.object({
      identifier: yup.string().required(translatedErrors.required),
      password: yup.string().required(translatedErrors.required),
    }),
  },
  register: {
    endPoint: 'local/register',
    inputs: [
      [
        {
          label: {
            id: 'Auth.form.register.username.label',
          },
          name: 'username',
          type: 'text',
          placeholder: 'Auth.form.register.username.placeholder',
        },
      ],
      [
        {
          label: {
            id: 'Auth.form.register.password.label',
          },
          name: 'password',
          type: 'password',
        },
      ],
      [
        {
          label: {
            id: 'Auth.form.register.confirmPassword.label',
          },
          name: 'passwordConfirmation',
          type: 'password',
        },
      ],
      [
        {
          label: {
            id: 'Auth.form.register.email.label',
          },
          name: 'email',
          type: 'email',
          placeholder: 'Auth.form.register.email.placeholder',
        },
      ],
      [
        {
          label: {
            id: 'Auth.form.register.news.label',
          },
          name: 'news',
          type: 'checkbox',
          value: false,
        },
      ],
    ],
    schema: yup.object({
      email: yup
        .string()
        .email(translatedErrors.email)
        .required(translatedErrors.required),
      username: yup.string().required(translatedErrors.required),
      password: yup
        .string()
        .min(6, translatedErrors.minLength)
        .required(translatedErrors.required),
      passwordConfirmation: yup
        .string()
        .min(6, translatedErrors.minLength)
        .oneOf(
          [yup.ref('password'), null],
          'components.Input.error.password.noMatch'
        )
        .required(translatedErrors.required),
    }),
  },
  'reset-password': {
    endPoint: 'reset-password',
    inputs: [
      [
        {
          name: 'password',
          type: 'password',
          label: {
            id: 'Auth.form.register.password.label',
          },
        },
      ],
      [
        {
          name: 'passwordConfirmation',
          type: 'password',
          label: {
            id: 'Auth.form.register.confirmPassword.label',
          },
        },
      ],
    ],
    schema: yup.object({
      code: yup.string().required(translatedErrors.required),
      password: yup
        .string()
        .min(6, translatedErrors.minLength)
        .required(translatedErrors.required),
      passwordConfirmation: yup
        .string()
        .min(6, translatedErrors.required)
        .oneOf(
          [yup.ref('password'), null],
          'components.Input.error.password.noMatch'
        )
        .required(translatedErrors.required),
    }),
  },
};

export default form;
