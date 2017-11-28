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
  LOAD_COUNT,
  LOAD_RECORDS,
  LOADED_COUNT,
  LOADED_RECORDS,
  SET_CURRENT_MODEL_NAME,
} from './constants';

export function changeLimit(limit) {
  return {
    type: CHANGE_LIMIT,
    limit,
  };
}

export function changePage(page) {
  return {
    type: CHANGE_PAGE,
    page,
  };
}

export function changeSort(sort) {
  return {
    type: CHANGE_SORT,
    sort,
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
