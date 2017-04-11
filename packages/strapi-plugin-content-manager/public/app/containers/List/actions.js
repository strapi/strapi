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
  CHANGE_PAGE,
  CHANGE_ORDER,
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

export function changePage(page) {
  return {
    type: CHANGE_PAGE,
    page,
  };
}
