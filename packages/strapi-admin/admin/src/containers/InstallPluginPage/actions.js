/*
 *
 * InstallPluginPage actions
 *
 */

import {
  GET_PLUGINS,
  GET_PLUGINS_SUCCEEDED,
  ON_CHANGE,
} from './constants';

export function getPlugins() {
  return {
    type: GET_PLUGINS,
  };
}

export function getPluginsSucceeded(availablePlugins) {
  return {
    type: GET_PLUGINS_SUCCEEDED,
    availablePlugins,
  };
}

export function onChange({ target }) {
  return {
    type: ON_CHANGE,
    keys: target.name.split('.'),
    value: target.value,
  };
}
