/*
 *
 * App actions
 *
 */

import {
  ENVIRONMENTS_FETCH,
  ENVIRONMENTS_FETCH_SUCCEEDED,
  FREEZE_APP,
  MENU_FETCH_SUCCEEDED,
  MENU_FETCH,
  UNFREEZE_APP,
} from './constants';

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

export function freezeApp() {
  return {
    type: FREEZE_APP,
  };
}

export function fetchMenuSucceeded(menu) {
  return {
    type: MENU_FETCH_SUCCEEDED,
    menu,
  };
}

export function menuFetch() {
  return {
    type: MENU_FETCH,
  };
}

export function unfreezeApp() {
  return {
    type: UNFREEZE_APP,
  };
}
