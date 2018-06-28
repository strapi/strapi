/*
 *
 * App actions
 *
 */

import { includes } from 'lodash';
import {
  EMPTY_STORE,
  GET_MODEL_ENTRIES,
  GET_MODEL_ENTRIES_SUCCEEDED,
  LOAD_MODELS,
  LOADED_MODELS,
  ON_CHANGE,
  ON_RESET,
  ON_SUBMIT,
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

export function onChange({ target }) {
  const value = includes(target.name, 'pageEntries') ? parseInt(target.value, 10) : target.value;

  return {
    type: ON_CHANGE,
    keys: target.name.split('.'),
    value,
  };
}

export function onReset() {
  return {
    type: ON_RESET,
  };
}

export function onSubmit() {
  return {
    type: ON_SUBMIT,
  };
}