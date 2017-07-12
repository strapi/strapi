/*
 *
 * App actions
 *
 */

import {
  MENU_FETCH,
  MENU_FETCH_SUCCEEDED,
} from './constants';


export function menuFetch() {
  return {
    type: MENU_FETCH,
  };
}

export function fetchMenuSucceeded(menu) {
  return {
    type: MENU_FETCH_SUCCEEDED,
    menu,
  };
}
