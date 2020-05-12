/*
 *
 * HomePage actions
 *
 */

import {
  CHANGE_PARAMS,
  DELETE_DATA,
  DELETE_SUCCESS,
  DROP_SUCCESS,
  GET_DATA,
  GET_DATA_SUCCESS,
  ON_DROP,
  ON_SEARCH,
  ON_SEARCH_SUCCESS,
  SET_LOADING,
  SET_PARAMS,
  UNSET_LOADING,
} from './constants';

export function changeParams({ target }) {
  return {
    type: CHANGE_PARAMS,
    keys: target.name.split('.'),
    value: target.value,
  };
}

export function deleteData(dataToDelete) {
  return {
    type: DELETE_DATA,
    dataToDelete,
  };
}

export function deleteSuccess() {
  return {
    type: DELETE_SUCCESS,
  };
}

export function dropSuccess(newFiles) {
  return {
    type: DROP_SUCCESS,
    newFiles,
  };
}

export function getData() {
  return {
    type: GET_DATA,
  };
}

export function getDataSuccess(data, entriesNumber) {
  return {
    type: GET_DATA_SUCCESS,
    data,
    entriesNumber,
  };
}

export function onDrop({ dataTransfer: { files } }) {
  const formData = Object.keys(files).reduce((acc, current) => {
    acc.append('files', files[current]);

    return acc;
  }, new FormData());

  return {
    type: ON_DROP,
    formData,
  };
}

export function onSearch({ target }) {
  return {
    type: ON_SEARCH,
    value: target.value,
  };
}

export function setLoading() {
  return {
    type: SET_LOADING,
  };
}

export function setParams(params) {
  return {
    type: SET_PARAMS,
    params,
  };
}

export function onSearchSuccess(data) {
  return {
    type: ON_SEARCH_SUCCESS,
    data,
  };
}

export function unsetLoading() {
  return {
    type: UNSET_LOADING,
  };
}
