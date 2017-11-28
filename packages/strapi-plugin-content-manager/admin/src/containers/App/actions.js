/*
 *
 * App actions
 *
 */

import {
  EMPTY_STORE,
  GET_MODEL_ENTRIES,
  GET_MODEL_ENTRIES_SUCCEEDED,
  LOAD_MODELS,
  LOADED_MODELS,
  UPDATE_SCHEMA,
} from './constants';

export function emptyStore() {
  return {
    type: EMPTY_STORE,
  };
}

export function getModelEntries(modelName, source) {
  return {
    type: GET_MODEL_ENTRIES,
    modelName,
    source,
  };
}

export function getModelEntriesSucceeded(count) {
  return {
    type: GET_MODEL_ENTRIES_SUCCEEDED,
    count,
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
