/*
 *
 * InstallPluginPage actions
 *
 */

import {
  DOWNLOAD_PLUGIN,
  DOWNLOAD_PLUGIN_ERROR,
  DOWNLOAD_PLUGIN_SUCCEEDED,
  GET_PLUGINS,
  GET_PLUGINS_SUCCEEDED,
  ON_CHANGE,
} from './constants';

export function downloadPlugin(pluginToDownload) {
  return {
    type: DOWNLOAD_PLUGIN,
    pluginToDownload,
  };
}

export function downloadPluginError() {
  return {
    type: DOWNLOAD_PLUGIN_ERROR,
  };
}

export function downloadPluginSucceeded() {
  return {
    type: DOWNLOAD_PLUGIN_SUCCEEDED,
  };
}

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
