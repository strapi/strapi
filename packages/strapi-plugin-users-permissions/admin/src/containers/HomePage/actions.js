/*
 *
 * HomePage actions
 *
 */

import {
  FETCH_DATA,
  FETCH_DATA_SUCCEEDED,
} from './constants';

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
