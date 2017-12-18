/*
 *
 * List actions
 *
 */

import pluralize from 'pluralize';

import {
  DELETE_RECORD_SUCCESS,
} from '../Edit/constants';

import {
  CHANGE_LIMIT,
  CHANGE_PAGE,
  CHANGE_SORT,
  DECREASE_COUNT,
  LOAD_COUNT,
  LOAD_RECORDS,
  LOADED_COUNT,
  LOADED_RECORDS,
  SET_CURRENT_MODEL_NAME,
} from './constants';

export function changeLimit(limit, source) {
  return {
    type: CHANGE_LIMIT,
    limit: limit <= 0 ? 20 : limit,
    source,
  };
}

export function changePage(page, source) {
  return {
    type: CHANGE_PAGE,
    page: page <= 0 ? 1 : page,
    source,
  };
}

export function changeSort(sort, source) {
  return {
    type: CHANGE_SORT,
    sort,
    source,
  };
}

export function decreaseCount() {
  return {
    type: DECREASE_COUNT,
  };
}

export function loadCount(source) {
  return {
    type: LOAD_COUNT,
    source,
  };
}

export function loadRecords(source) {
  return {
    type: LOAD_RECORDS,
    source,
  };
}

export function loadedCount(count) {
  return {
    type: LOADED_COUNT,
    count,
  };
}

export function loadedRecord(records) {
  return {
    type: LOADED_RECORDS,
    records,
  };
}

export function setCurrentModelName(modelName) {
  return {
    type: SET_CURRENT_MODEL_NAME,
    modelName,
    modelNamePluralized: pluralize(modelName),
  };
}

export function recordDeleted() {
  return {
    type: DELETE_RECORD_SUCCESS,
  };
}
