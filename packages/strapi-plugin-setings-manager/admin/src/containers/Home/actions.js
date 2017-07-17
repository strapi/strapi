/*
 *
 * Home actions
 *
 */
import {
  CONFIG_FETCH,
  ENVIRONMENTS_FETCH,
  CONFIG_FETCH_SUCCEEDED,
  ENVIRONMENTS_FETCH_SUCCEEDED,
  DEFAULT_ACTION,
} from './constants';

export function defaultAction() {
  return {
    type: DEFAULT_ACTION,
  }
}

export function configFetch(endPoint) {
  return {
    type: CONFIG_FETCH,
    endPoint,
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

export function configFetchSucceded(configs) {
  return {
    type: CONFIG_FETCH_SUCCEEDED,
    configs,
  };
}
