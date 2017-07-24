/*
 *
 * App actions
 *
 */

import {
  MENU_FETCH,
  ENVIRONMENTS_FETCH,
  MENU_FETCH_SUCCEEDED,
  ENVIRONMENTS_FETCH_SUCCEEDED,
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

export function environmentsFetch() {
  return {
    type: ENVIRONMENTS_FETCH,
  };
}

export function environmentsFetchSucceeded(environments) {
  return {
    type: ENVIRONMENTS_FETCH_SUCCEEDED,
    environments,
  };
}
