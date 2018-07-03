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
  MOVE_ATTR,
  ON_CHANGE,
  ON_CHANGE_SETTINGS,
  ON_CLICK_ADD_ATTR,
  ON_REMOVE,
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

export function moveAttr(dragIndex, hoverIndex, keys) {
  return {
    type: MOVE_ATTR,
    dragIndex,
    hoverIndex,
    keys,
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

export function onChangeSettings({ target }) {
  const value = includes(target.name, 'pageEntries') ? parseInt(target.value, 10) : target.value;

  return {
    type: ON_CHANGE_SETTINGS,
    keys: target.name.split('.'),
    value,
  };
}

export function onClickAddAttr(data, keys) {
  return {
    type: ON_CLICK_ADD_ATTR,
    data,
    keys,
  };
}

export function onRemove(index, keys) {
  return {
    type: ON_REMOVE,
    index,
    keys,
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