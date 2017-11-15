/*
 *
 * EditPage actions
 *
 */
import { List, Map } from 'immutable';
import {
  ADD_USER,
  GET_ROLE,
  GET_ROLE_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_DELETE,
  SET_FORM,
} from './constants';

export function addUser(newUser) {
  return {
    type: ADD_USER,
    newUser,
  };
}

export function getRole() {
  return {
    type: GET_ROLE,
  };
}

export function getRoleSucceeded(data) {
  return {
    type: GET_ROLE_SUCCEEDED,
    data,
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

export function setForm() {
  const form = Map({
    name: '',
    description: '',
    users: List([
      { name: 'Pierre Burgy' },
      { name: 'Jim Laurie' },
      { name: 'Aurelien Georget' },
      { name: 'Cyril Lopez' },
    ]),
  });

  return {
    type: SET_FORM,
    form,
  };
}
