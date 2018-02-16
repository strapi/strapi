/*
 *
 * HomePage actions
 *
 */

import {
  DROP_SUCCESS,
  GET_DATA,
  GET_DATA_SUCCESS,
  ON_DROP,
  ON_SEARCH,
} from './constants';

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
  return {
    type: ON_DROP,
    files,
  }
}

export function onSearch({ target }) {
  return {
    type: ON_SEARCH,
    value: target.value,
  };
}
