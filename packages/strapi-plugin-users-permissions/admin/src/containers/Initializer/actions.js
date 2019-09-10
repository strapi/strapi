/*
 *
 * Initializer actions
 *
 */

import {
  INITIALIZE,
  INITIALIZE_SUCCEEDED,
  UPDATE_HAS_ADMIN,
} from './constants';

export function initialize() {
  return {
    type: INITIALIZE,
  };
}

export function initializeSucceeded(data) {
  return {
    type: INITIALIZE_SUCCEEDED,
    data,
  };
}

export function updateHasAdmin(value) {
  return {
    type: UPDATE_HAS_ADMIN,
    value,
  };
}
