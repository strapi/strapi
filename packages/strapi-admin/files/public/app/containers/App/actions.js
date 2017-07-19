/*
 *
 * LanguageProvider actions
 *
 */

import {
  LOAD_PLUGIN,
  UPDATE_PLUGIN,
  PLUGIN_LOADED,
} from './constants';

export function loadPlugin(newPlugin) {
  return {
    type: LOAD_PLUGIN,
    plugin: newPlugin,
  };
}

export function updatePlugin(pluginId, updatedKey, updatedValue) {
  return {
    type: UPDATE_PLUGIN,
    pluginId,
    updatedKey,
    updatedValue,
  };
}

export function pluginLoaded(newPlugin) {
  return {
    type: PLUGIN_LOADED,
    plugin: newPlugin,
  };
}
