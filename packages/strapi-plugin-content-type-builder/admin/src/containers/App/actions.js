/*
 *
 * App actions
 *
 */

import { MODELS_FETCH, MODELS_FETCH_SUCCEEDED } from './constants';

export function modelsFetch() {
  return {
    type: MODELS_FETCH,
  };
}

export function modelsFetchSucceeded(models) {
  return {
    type: MODELS_FETCH_SUCCEEDED,
    models,
  };
}
