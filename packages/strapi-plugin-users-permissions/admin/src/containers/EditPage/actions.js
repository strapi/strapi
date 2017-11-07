/*
 *
 * EditPage actions
 *
 */

import {
  ADD_USER,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_DELETE,
} from './constants';

export function addUser(newUser) {
  return {
    type: ADD_USER,
    newUser,
  };
}

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

export function onClickDelete(itemToDelete) {
  return {
    type: ON_CLICK_DELETE,
    itemToDelete,
  };
}
