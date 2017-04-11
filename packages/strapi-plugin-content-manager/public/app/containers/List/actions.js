/*
 *
 * List actions
 *
 */

import {
  SET_CURRENT_MODEL_NAME,
  LOAD_RECORDS,
  LOADED_RECORDS,
  LOAD_COUNT,
  LOADED_COUNT,
  GO_NEXT_PAGE,
  GO_PREVIOUS_PAGE,
} from './constants';

export function setCurrentModelName(modelName) {
  return {
    type: SET_CURRENT_MODEL_NAME,
    modelName
  };
}

export function loadRecords() {
  return {
    type: LOAD_RECORDS,
  };
}

export function loadedRecord(records) {
  return {
    type: LOADED_RECORDS,
    records,
  };
}

export function loadCount() {
  return {
    type: LOAD_COUNT,
  };
}

export function loadedCount(count) {
  return {
    type: LOADED_COUNT,
    count,
  };
}

export function goNextPage() {
  return {
    type: GO_NEXT_PAGE,
  };
}

export function goPreviousPage() {
  return {
    type: GO_PREVIOUS_PAGE,
  };
}
