/*
 *
 * LanguageProvider actions
 *
 */

import {
  PLUGIN_LOADED,
  LOAD_PLUGIN,
} from './constants';

export function loadPlugin(newPlugin) {
  return {
    type: LOAD_PLUGIN,
    plugin: newPlugin,
  };
}

export function pluginLoaded(newPlugin) {
  return {
    type: PLUGIN_LOADED,
    plugin: newPlugin,
  };
}
