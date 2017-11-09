/*
 *
 * ListPluginsPage actions
 *
 */

import {
  GET_PLUGINS,
  GET_PLUGINS_SUCCEEDED,
  ON_DELETE_PLUGIN_CLICK,
  ON_DELETE_PLUGIN_CONFIRM,
  DELETE_PLUGIN_SUCCEEDED,
} from './constants';

export function getPlugins() {
  return {
    type: GET_PLUGINS,
  };
}

export function getPluginsSucceeded({ plugins }) {
  return {
    type: GET_PLUGINS_SUCCEEDED,
    plugins,
  };
}

export function onDeletePluginClick({ target }) {
  return {
    type: ON_DELETE_PLUGIN_CLICK,
    pluginToDelete: target.id,
  };
}

export function onDeletePluginConfirm() {
  return {
    type: ON_DELETE_PLUGIN_CONFIRM,
  };
}

export function deletePluginSucceeded(plugin) {
  return {
    type: DELETE_PLUGIN_SUCCEEDED,
    plugin,
  };
}
