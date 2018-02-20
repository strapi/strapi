/**
 *
 * ListPage actions
 *
 */

import {
  CHANGE_PARAMS,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  SET_PARAMS,
} from './constants';

export function changeParams({ target }) {
  return {
    type: CHANGE_PARAMS,
    keys: target.name.split('.'),
    value: target.value,
  };
}

export function getData(currentModel) {
  return {
    type: GET_DATA,
    currentModel,
  };
}

export function getDataSucceeded(data) {
  return {
    type: GET_DATA_SUCCEEDED,
    data,
  };
}

export function setParams(params) {
  return {
    type: SET_PARAMS,
    params,
  };
}
