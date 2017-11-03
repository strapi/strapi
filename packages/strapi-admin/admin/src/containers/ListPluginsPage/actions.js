/*
 *
 * ListPluginsPage actions
 *
 */

import {
  DEFAULT_ACTION,
  ON_DELETE_PLUGIN_CLICK,
  ON_DELETE_PLUGIN_CONFIRM,
  DELETE_PLUGIN_SUCCEEDED,
} from './constants';

export function defaultAction() {
  return {
    type: DEFAULT_ACTION,
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

export function deletePluginSucceeded() {
  return {
    type: DELETE_PLUGIN_SUCCEEDED,
  };
}
