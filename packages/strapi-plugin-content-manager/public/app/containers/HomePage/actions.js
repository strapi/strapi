/*
 * Actions
 */

import {
  LOAD,
  LOAD_SUCCESS
} from './constants';

/**
 * Load the generalSettings, this action starts the request saga
 *
 * @return {object} An action object with a type of LOAD_GENERAL_SETTINGS
 */
export function load_success(data) {
  console.log('load_success() called');
  return {
    type: LOAD_SUCCESS,
    data
  };
}

export function load() {
  console.log('load() called');
  return {
    type: LOAD
  };
}
