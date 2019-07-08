import { GET_DATA, GET_DATA_SUCCEEDED, RESET_PROPS } from './constants';

export function getData(uid, params) {
  return {
    type: GET_DATA,
    uid,
    params,
  };
}

export function getDataSucceeded(count, data) {
  return {
    type: GET_DATA_SUCCEEDED,
    count,
    data,
  };
}

export function resetProps() {
  return { type: RESET_PROPS };
}
