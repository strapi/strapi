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
