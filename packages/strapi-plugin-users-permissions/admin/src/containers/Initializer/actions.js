/*
 *
 * Initializer actions
 *
 */

import { INITIALIZE, INITIALIZE_SUCCEEDED } from './constants';

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
