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
} from './constants';

export function getSettings(env) {
  return {
    type: GET_SETTINGS,
    env,
  };
}

export function getSettingsSucceeded(settings) {
  return {
    type: GET_SETTINGS_SUCCEEDED,
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
  const value = target.name === 'sizeLimit' ? parseInt(target.value, 10) * 1000 : target.value;

  return {
    type: ON_CHANGE,
    keys,
    value,
  };
}
