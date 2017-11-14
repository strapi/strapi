/*
 *
 * AuthPage actions
 *
 */

import {
  ON_CHANGE_INPUT,
  SET_ERRORS,
  SET_FORM,
  SUBMIT,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED,
} from './constants';

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
    default:
      data = {};
  }

  return {
    type: SET_FORM,
    data,
  };
}

export function submit() {
  return {
    type: SUBMIT,
  };
}

export function submitError(errors) {
  return {
    type: SUBMIT_ERROR,
    errors,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}
