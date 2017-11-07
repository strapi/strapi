/*
 *
 * EditPage actions
 *
 */

import {
  ON_CANCEL,
  ON_CHANGE_INPUT,
} from './constants';

export function onCancel() {
  return {
    type: ON_CANCEL,
  };
}

export function onChangeInput({ target }) {
  return {
    type: ON_CHANGE_INPUT,
    key: target.name,
    value: target.value,
  };
}
