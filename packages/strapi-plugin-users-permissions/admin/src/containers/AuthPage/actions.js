/*
 *
 * AuthPage actions
 *
 */

import {
  HIDE_LOGIN_ERRORS_INPUT,
  ON_CHANGE_INPUT,
  SET_ERRORS,
  SET_FORM,
  SUBMIT,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED,
} from './constants';

export function hideLoginErrorsInput(value) {
  return {
    type: HIDE_LOGIN_ERRORS_INPUT,
    value,
  };
}

export function onChangeInput({ target }) {
  return {
    type: ON_CHANGE_INPUT,
    key: target.name,
    value: target.value,
  };
}

export function setErrors(formErrors) {
  return {
    type: SET_ERRORS,
    formErrors,
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
        identifier: '',
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
    case 'reset-password':
      data = {
        password: '',
        passwordConfirmation: '',
        code: email,
      };
      break;
    default:
      data = {};
  }

  return {
    type: SET_FORM,
    data,
    formType,
  };
}

export function submit(context) {
  return {
    type: SUBMIT,
    context,
  };
}

export function submitError(formErrors) {
  return {
    type: SUBMIT_ERROR,
    formErrors,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}
