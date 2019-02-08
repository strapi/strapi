import {
  DOWNLOAD_PLUGIN,
  DOWNLOAD_PLUGIN_SUCCEEDED,
  GET_AVAILABLE_AND_INSTALLED_PLUGINS,
  GET_AVAILABLE_AND_INSTALLED_PLUGINS_SUCCEEDED,
  RESET_PROPS,
} from './constants';

export function downloadPlugin(pluginToDownload) {
  return {
    type: DOWNLOAD_PLUGIN,
    pluginToDownload,
  };
}

export function downloadPluginSucceeded() {
  return {
    type: DOWNLOAD_PLUGIN_SUCCEEDED,
  };
}

export function getAvailableAndInstalledPlugins() {
  return {
    type: GET_AVAILABLE_AND_INSTALLED_PLUGINS,
  };
}

export function getAvailableAndInstalledPluginsSucceeded(availablePlugins, installedPlugins) {
  return {
    type: GET_AVAILABLE_AND_INSTALLED_PLUGINS_SUCCEEDED,
    availablePlugins,
    installedPlugins,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}
