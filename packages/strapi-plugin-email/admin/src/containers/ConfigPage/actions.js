/**
 *
 *
 * ConfigPage actions
 *
 */

import {
  GET_SETTINGS,
  GET_SETTINGS_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE,
  SET_ERRORS,
  SUBMIT,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED,
} from './constants';

export function getSettings(env) {
  return {
    type: GET_SETTINGS,
    env,
  };
}

export function getSettingsSucceeded(settings, appEnvironments) {
  return {
    type: GET_SETTINGS_SUCCEEDED,
    appEnvironments,
    settings,
    initialData: settings.config,
  };
}

export function onCancel() {
  return {
    type: ON_CANCEL,
  };
}

export function onChange({ target }) {
  const keys = ['modifiedData'].concat(target.name.split('.'));
  const value = target.value;

  return {
    type: ON_CHANGE,
    keys,
    value,
  };
}

export function setErrors(errors) {
  return {
    type: SET_ERRORS,
    errors,
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

export function submitSucceeded(data) {
  return {
    type: SUBMIT_SUCCEEDED,
    data,
  };
}
