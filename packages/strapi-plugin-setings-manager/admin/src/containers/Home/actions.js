/*
 *
 * Home actions
 *
 */

import {
  CONFIG_FETCH,
  CONFIG_FETCH_SUCCEEDED,
} from './constants';

export function defaultAction() {
  return {
    type: DEFAULT_ACTION
  }
}

export function configFetch(endPoint) {
  return {
    type: CONFIG_FETCH,
    endPoint,
  };
}

export function configFetchSucceded(config) {
  return {
    type: CONFIG_FETCH_SUCCEEDED,
    config,
  };
}
