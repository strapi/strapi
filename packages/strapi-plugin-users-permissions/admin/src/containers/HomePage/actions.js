/*
 *
 * HomePage actions
 *
 */

import {
  DELETE_DATA,
  DELETE_DATA_SUCCEEDED,
  FETCH_DATA,
  FETCH_DATA_SUCCEEDED,
} from './constants';

export function deleteData(dataToDelete, deleteEndPoint) {
  return {
    type: DELETE_DATA,
    dataToDelete,
    deleteEndPoint,
  };
}

export function deleteDataSucceeded(indexDataToDelete) {
  return {
    type: DELETE_DATA_SUCCEEDED,
    indexDataToDelete,
  };
}

export function fetchData(endPoint) {
  return {
    type: FETCH_DATA,
    endPoint,
  };
}

export function fetchDataSucceeded(data) {
  return {
    type: FETCH_DATA_SUCCEEDED,
    data,
  };
}
