/*
 *
 * InstallPluginPage actions
 *
 */

import {
  DOWNLOAD_PLUGIN,
  DOWNLOAD_PLUGIN_ERROR,
  DOWNLOAD_PLUGIN_SUCCEEDED,
  GET_AVAILABLE_PLUGINS,
  GET_AVAILABLE_PLUGINS_SUCCEEDED,
  GET_INSTALLED_PLUGINS,
  GET_INSTALLED_PLUGINS_SUCCEEDED,
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

export function getAvailablePlugins() {
  return {
    type: GET_AVAILABLE_PLUGINS,
  };
}

export function getAvailablePluginsSucceeded(availablePlugins) {
  return {
    type: GET_AVAILABLE_PLUGINS_SUCCEEDED,
    availablePlugins,
  };
}

export function getInstalledPlugins() {
  return {
    type: GET_INSTALLED_PLUGINS,
  };
}

export function getInstalledPluginsSucceeded(installedPlugins) {
  return {
    type: GET_INSTALLED_PLUGINS_SUCCEEDED,
    installedPlugins,
  };
}

export function onChange({ target }) {
  return {
    type: ON_CHANGE,
    keys: target.name.split('.'),
    value: target.value,
  };
}
