/*
 * Actions
 */

import {
  LOAD_GENERAL_SETTINGS,
  LOAD_GENERAL_SETTINGS_SUCCESS,
  LOAD_GENERAL_SETTINGS_ERROR,
  CHANGE_NAME,
  CHANGE_DESCRIPTION,
  CHANGE_VERSION,
  UPDATE_GENERAL_SETTINGS,
  UPDATE_GENERAL_SETTINGS_SUCCESS,
  UPDATE_GENERAL_SETTINGS_ERROR,
  CANCEL_GENERAL_SETTINGS,
} from './constants';

/**
 * Load the generalSettings, this action starts the request saga
 *
 * @return {object} An action object with a type of LOAD_GENERAL_SETTINGS
 */
export function loadGeneralSettings() {
  return {
    type: LOAD_GENERAL_SETTINGS,
  };
}

/**
 * Dispatched when the generalSettings are loaded by the request saga
 *
 * @param  {object} generalSettings The generalSettings data
 *
 * @return {object}                 An action object with a type of LOAD_GENERAL_SETTINGS_SUCCESS passing the generalSettings
 */
export function generalSettingsLoaded(data) {
  return {
    type: LOAD_GENERAL_SETTINGS_SUCCESS,
    data,
  };
}

/**
 * Dispatched when loading the generalSettings fails
 *
 * @param  {object} error The error
 *
 * @return {object}       An action object with a type of LOAD_GENERAL_SETTINGS_ERROR passing the error
 */
export function generalSettingsLoadingError(error) {
  return {
    type: LOAD_GENERAL_SETTINGS_ERROR,
    error,
  };
}

/**
 * Change the `name` value
 *
 * @return {object} An action object with a type of CHANGE_NAME
 */
export function changeName(name) {
  return {
    type: CHANGE_NAME,
    name,
  };
}

/**
 * Change the `description` value
 *
 * @return {object} An action object with a type of CHANGE_DESCRIPTION
 */
export function changeDescription(description) {
  return {
    type: CHANGE_DESCRIPTION,
    description,
  };
}

/**
 * Change the `version` value
 *
 * @return {object} An action object with a type of CHANGE_VERSION
 */
export function changeVersion(version) {
  return {
    type: CHANGE_VERSION,
    version,
  };
}

/**
 * Update the generalSettings, this action starts the request saga
 *
 * @return {object} An action object with a type of UPDATE_GENERAL_SETTINGS
 */
export function updateGeneralSettings(data) {
  return {
    type: UPDATE_GENERAL_SETTINGS,
    data,
  };
}

/**
 * Dispatched when the generalSettings are updated by the request saga
 *
 * @param  {object} generalSettings The generalSettings data
 *
 * @return {object}                 An action object with a type of UPDATE_GENERAL_SETTINGS_SUCCESS passing the generalSettings
 */
export function generalSettingsUpdated(data) {
  return {
    type: UPDATE_GENERAL_SETTINGS_SUCCESS,
    data,
  };
}

/**
 * Dispatched when updating the generalSettings fails
 *
 * @param  {object} error The error
 *
 * @return {object}       An action object with a type of UPDATE_GENERAL_SETTINGS_ERROR passing the error
 */
export function generalSettingsUpdatedError(error) {
  return {
    type: UPDATE_GENERAL_SETTINGS_ERROR,
    error,
  };
}

/**
 * Dispatched when cancelling the data modifications
 *
 * @return {object}       An action object with a type of CANCEL_GENERAL_SETTINGS passing the error
 */
export function cancelGeneralSettings() {
  return {
    type: CANCEL_GENERAL_SETTINGS,
  };
}
