/*
 *
 * Admin actions
 *
 */

import { EMIT_EVENT, SET_APP_ERROR } from './constants';

export function emitEvent(event, properties) {
  return {
    type: EMIT_EVENT,
    event,
    properties,
  };
}

export function setAppError() {
  return {
    type: SET_APP_ERROR,
  };
}
