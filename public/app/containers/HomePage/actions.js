/*
 * App Actions
 *
 * Actions change things in your application
 * Since this boilerplate uses a uni-directional data flow, specifically redux,
 * we have these actions which are the only way your application interacts with
 * your application state. This guarantees that your state is up to date and nobody
 * messes it up weirdly somewhere.
 *
 * To add a new Action:
 * 1) Import your constant
 * 2) Add a function like this:
 *    export function yourAction(var) {
 *        return { type: YOUR_ACTION_CONSTANT, var: var }
 *    }
 */

import {
  LOAD_GENERAL_SETTINGS,
  LOAD_GENERAL_SETTINGS_SUCCESS,
  LOAD_GENERAL_SETTINGS_ERROR,
  CHANGE_APP_NAME,
  UPDATE_GENERAL_SETTINGS,
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
 * @param  {array} generalSettings The generalSettings data
 * @param  {string} username The current username
 *
 * @return {object}      An action object with a type of LOAD_GENERAL_SETTINGS_SUCCESS passing the generalSettings
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

export function changeName(name) {
  return {
    type: CHANGE_APP_NAME,
    name: name
  };
}

export function updateGeneralSettings(data) {
  return {
    type: UPDATE_GENERAL_SETTINGS,
    data: data
  }
}