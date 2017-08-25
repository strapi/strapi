/*
 *
 * ModelPage actions
 *
 */

import {
  DEFAULT_ACTION,
  MODEL_FETCH,
  MODEL_FETCH_SUCCEEDED,
} from './constants';

export function defaultAction() {
  return {
    type: DEFAULT_ACTION,
  };
}

export function modelFetch(modelName) {
  return {
    type: MODEL_FETCH,
    modelName,
  };
}

export function modelFetchSucceeded(model) {
  console.log('model', model);
  return {
    type: MODEL_FETCH_SUCCEEDED,
    model,
  };
}
