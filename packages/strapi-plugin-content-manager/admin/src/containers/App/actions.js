/*
 *
 * App actions
 *
 */

import { EMPTY_STORE, LOAD_MODELS, LOADED_MODELS, UPDATE_SCHEMA } from './constants';

export function emptyStore() {
  return {
    type: EMPTY_STORE,
  };
}

export function loadModels() {
  return {
    type: LOAD_MODELS,
  };
}

export function loadedModels(models) {
  return {
    type: LOADED_MODELS,
    models,
  };
}

export function updateSchema(schema) {
  return {
    type: UPDATE_SCHEMA,
    schema,
  };
}
