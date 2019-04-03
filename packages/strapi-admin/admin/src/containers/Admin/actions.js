/*
 *
 * Admin actions
 *
 */

import {
  EMIT_EVENT,
  GET_INIT_DATA,
  GET_INIT_DATA_SUCCEEDED,
  GET_SECURED_DATA,
  GET_SECURED_DATA_SUCCEEDED,
  HIDE_LEFT_MENU,
  HIDE_LOGOUT,
  SET_APP_ERROR,
  SET_APP_SECURED,
  SHOW_LEFT_MENU,
  SHOW_LOGOUT,
  UNSET_APP_SECURED,
} from './constants';

export function emitEvent(event, properties) {
  return {
    type: EMIT_EVENT,
    event,
    properties,
  };
}

export function getInitData() {
  return {
    type: GET_INIT_DATA,
  };
}

export function getInitDataSucceeded(data) {
  return {
    type: GET_INIT_DATA_SUCCEEDED,
    data,
  };
}

export function getSecuredData() {
  return {
    type: GET_SECURED_DATA,
  };
}

export function getSecuredDataSucceeded(data) {
  return {
    type: GET_SECURED_DATA_SUCCEEDED,
    data,
  };
}

export function hideLeftMenu() {
  return {
    type: HIDE_LEFT_MENU,
  };
}

export function hideLogout() {
  return {
    type: HIDE_LOGOUT,
  };
}

export function setAppError() {
  return {
    type: SET_APP_ERROR,
  };
}

export function setAppSecured() {
  return {
    type: SET_APP_SECURED,
  };
}

export function showLeftMenu() {
  return {
    type: SHOW_LEFT_MENU,
  };
}

export function showLogout() {
  return {
    type: SHOW_LOGOUT,
  };
}

export function unsetAppSecured() {
  return {
    type: UNSET_APP_SECURED,
  };
}
