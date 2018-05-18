/**
 *
 * ListPage actions
 *
 */

import {
  ADD_FILTER,
  CHANGE_PARAMS,
  DELETE_DATA,
  DELETE_DATA_SUCCESS,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_TOGGLE_FILTERS,
  REMOVE_FILTER,
  SET_PARAMS,
} from './constants';

export function addFilter(filter) {
  return {
    type: ADD_FILTER,
    filter,
  };
}

export function changeParams({ target }) {
  return {
    type: CHANGE_PARAMS,
    keys: target.name.split('.'),
    value: target.value,
  };
}

export function deleteData(id, modelName, source) {
  return {
    type: DELETE_DATA,
    id,
    modelName,
    source,
  };
}

export function deleteDataSuccess(id) {
  return {
    type: DELETE_DATA_SUCCESS,
    id,
  };
}

export function getData(currentModel, source) {
  return {
    type: GET_DATA,
    currentModel,
    source,
  };
}

export function getDataSucceeded(data) {
  return {
    type: GET_DATA_SUCCEEDED,
    data,
  };
}

export function onToggleFilters() {
  return {
    type: ON_TOGGLE_FILTERS,
  };
}

export function removeFilter(index) {
  return {
    type: REMOVE_FILTER,
    index,
  };
}

export function setParams(params) {
  return {
    type: SET_PARAMS,
    params,
  };
}
