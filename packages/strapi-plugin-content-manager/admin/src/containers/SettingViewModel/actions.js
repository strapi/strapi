import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE,
  ON_RESET,
  ON_SUBMIT,
  SUBMIT_SUCCEEDED,
} from './constants';

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

export function onChange({ target: { name, value } }) {
  return {
    type: ON_CHANGE,
    keys: ['modifiedData', ...name.split('.')],
    value,
  };
}

export function onReset() {
  return {
    type: ON_RESET,
  };
}
export function onSubmit(uid, emitEvent) {
  return {
    type: ON_SUBMIT,
    uid,
    emitEvent,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}
