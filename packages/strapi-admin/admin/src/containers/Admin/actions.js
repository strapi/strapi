/*
 *
 * Admin actions
 *
 */

import {
  GET_INIT_DATA,
  GET_INIT_DATA_SUCCEEDED,
  HIDE_LEFT_MENU,
  SET_APP_ERROR,
  SHOW_LEFT_MENU,
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

export function showLeftMenu() {
  return {
    type: SHOW_LEFT_MENU,
  };
}
