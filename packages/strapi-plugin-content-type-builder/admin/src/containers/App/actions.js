/*
 *
 * App actions
 *
 */

import { MODELS_FETCH, MODELS_FETCH_SUCCEEDED } from './constants';

export function modelsFetch() {
  console.log('fetching models');
  return {
    type: MODELS_FETCH,
  };
}

export function modelsFetchSucceeded(models) {
  console.log('succeeded');
  return {
    type: MODELS_FETCH_SUCCEEDED,
    models,
  };
}
