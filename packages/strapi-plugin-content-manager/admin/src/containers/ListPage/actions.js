/**
 *
 * ListPage actions
 *
 */

import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
} from './constants';

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
