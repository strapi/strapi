import {
  ON_CHANGE,
  SUBMIT,
  SUBMIT_SUCCEEDED,
} from './constants';

export function onChange({ target }) {
  return {
    type: ON_CHANGE,
    value: target.value,
  };
}

export function submit() {
  return {
    type: SUBMIT,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}
