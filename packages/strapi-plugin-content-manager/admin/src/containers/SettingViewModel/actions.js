import { GET_DATA, GET_DATA_SUCCEEDED } from './constants';

export function getData(uid) {
  return {
    type: GET_DATA,
    uid,
  };
}

export function getDataSucceeded(layout) {
  return {
    type: GET_DATA_SUCCEEDED,
    layout,
  };
}
