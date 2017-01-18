/*
 * Actions
 */

import {
  LOAD_DEFAULT
} from './constants';

/**
 * Load the generalSettings, this action starts the request saga
 *
 * @return {object} An action object with a type of LOAD_GENERAL_SETTINGS
 */
export function defaultLoad() {
  return {
    type: LOAD_DEFAULT,
  };
}
