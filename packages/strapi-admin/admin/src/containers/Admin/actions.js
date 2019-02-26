/*
 *
 * Admin actions
 *
 */

import {
  GET_INIT_DATA,
  GET_INIT_DATA_SUCCEEDED,
  GET_SECURED_DATA,
  GET_SECURED_DATA_SUCCEEDED,
  HIDE_LEFT_MENU,
  SET_APP_ERROR,
  SET_APP_SECURED,
  SHOW_LEFT_MENU,
  UNSET_APP_SECURED,
} from './constants';

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

export function unsetAppSecured() {
  return {
    type: UNSET_APP_SECURED,
  };
}
