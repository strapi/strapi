/*
 *
 * AuthPage actions
 *
 */

import {
  ON_CHANGE_INPUT,
  SET_FORM,
} from './constants';

export function onChangeInput({ target }) {
  return {
    type: ON_CHANGE_INPUT,
    key: target.name,
    value: target.value,
  };
}

export function setForm(formType, email) {
  let data;

  switch (formType) {
    case 'forgot-password':
      data = {
        email: '',
      };

      break;
    case 'login':
      data = {
        username: '',
        password: '',
        rememberMe: false,
      };

      break;
    case 'register':
      data = {
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
      };
      break;
    case 'register-success':
      data = {
        email,
      };
      break;
    default:
      data = {};
  }

  return {
    type: SET_FORM,
    data,
  };
}
