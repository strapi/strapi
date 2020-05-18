import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';
import Login from '../components/Login';
import Oops from '../components/Oops';
import Register from '../components/Register';

const forms = {
  login: {
    Component: Login,
    endPoint: 'login',
    fieldsToDisable: [],
    fieldsToOmit: ['rememberMe'],
    schema: yup.object().shape({
      email: yup
        .string()
        .email(translatedErrors.email)
        .required(translatedErrors.required),
      password: yup.string().required(translatedErrors.required),
      rememberMe: yup.bool().nullable(),
    }),
  },
  oops: {
    Component: Oops,
    endPoint: null,
    fieldsToDisable: [],
    fieldsToOmit: [],
    schema: null,
  },
  register: {
    Component: Register,
    endPoint: 'register',
    fieldsToDisable: ['email'],
    fieldsToOmit: ['confirmPassword', 'news', 'email'],
    schema: yup.object().shape({
      firstname: yup.string().required(translatedErrors.required),
      lastname: yup.string().required(translatedErrors.required),
      password: yup
        .string()
        .min(6, translatedErrors.minLength)
        .required(translatedErrors.required),
      confirmPassword: yup
        .string()
        .min(6, translatedErrors.minLength)
        .oneOf([yup.ref('password'), null], 'components.Input.error.password.noMatch')
        .required(translatedErrors.required),
    }),
  },
};

export default forms;
