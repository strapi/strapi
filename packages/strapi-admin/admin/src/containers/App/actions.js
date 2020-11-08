/*
 *
 * LanguageProvider actions
 *
 */

import {
  DISABLE_GLOBAL_OVERLAY_BLOCKER,
  ENABLE_GLOBAL_OVERLAY_BLOCKER,
  FREEZE_APP,
  GET_DATA_SUCCEEDED,
  LOAD_PLUGIN,
  PLUGIN_DELETED,
  PLUGIN_LOADED,
  UNFREEZE_APP,
  UNSET_HAS_USERS_PLUGIN,
  UPDATE_PLUGIN,
} from './constants';

export function disableGlobalOverlayBlocker() {
  return {
    type: DISABLE_GLOBAL_OVERLAY_BLOCKER,
  };
}

export function enableGlobalOverlayBlocker() {
  return {
    type: ENABLE_GLOBAL_OVERLAY_BLOCKER,
  };
}

export function freezeApp(data) {
  return {
    type: FREEZE_APP,
    data,
  };
}

export function getDataSucceeded(data) {
  return {
    type: GET_DATA_SUCCEEDED,
    data,
  };
}

export function loadPlugin(newPlugin) {
  return {
    type: LOAD_PLUGIN,
    plugin: newPlugin,
  };
}

export function pluginDeleted(plugin) {
  return {
    type: PLUGIN_DELETED,
    plugin,
  };
}

export function pluginLoaded(newPlugin) {
  return {
    type: PLUGIN_LOADED,
    plugin: newPlugin,
  };
}

export function unfreezeApp() {
  return {
    type: UNFREEZE_APP,
  };
}

export function unsetHasUserPlugin() {
  return {
    type: UNSET_HAS_USERS_PLUGIN,
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
