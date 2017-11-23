/*
 *
 * EditPage actions
 *
 */
import { fromJS, List, Map } from 'immutable';
import { get } from 'lodash';
import {
  ADD_USER,
  GET_PERMISSIONS,
  GET_PERMISSIONS_SUCCEEDED,
  GET_ROLE,
  GET_ROLE_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_DELETE,
  SET_ACTION_TYPE,
  SET_ERRORS,
  SET_FORM,
  SUBMIT,
  SUBMIT_ERROR,
  SUBMIT_SUCCEEDED,
} from './constants';

export function addUser(newUser) {
  return {
    type: ADD_USER,
    newUser,
  };
}

export function getPermissions() {
  return {
    type: GET_PERMISSIONS,
  };
}

export function getPermissionsSucceeded(data) {
  const permissions = Map(fromJS(data.permissions));

  return {
    type: GET_PERMISSIONS_SUCCEEDED,
    permissions,
  };
}

export function getRole(id) {
  return {
    type: GET_ROLE,
    id,
  };
}

export function getRoleSucceeded(data) {
  const form = Map({
    name: get(data, ['role', 'name']),
    description: get(data, ['role', 'description']),
    users: List(get(data, ['role', 'users'])),
    permissions: Map(fromJS(get(data, ['role', 'permissions']))),
  });

  return {
    type: GET_ROLE_SUCCEEDED,
    form,
  };
}

export function onCancel() {
  return {
    type: ON_CANCEL,
  };
}

export function onChangeInput({ target }) {
  const keys = ['modifiedData'].concat(target.name.split('.'));

  return {
    type: ON_CHANGE_INPUT,
    keys,
    value: target.value,
  };
}

export function onClickDelete(itemToDelete) {
  return {
    type: ON_CLICK_DELETE,
    itemToDelete,
  };
}
export function setActionType(action) {
  const actionType = action === 'create' ? 'POST' : 'PUT';

  return {
    type: SET_ACTION_TYPE,
    actionType,
  };
}

export function setErrors(formErrors) {
  return {
    type: SET_ERRORS,
    formErrors,
  };
}

export function setForm() {
  const form = Map({
    name: '',
    description: '',
    users: List([]),
    permissions: Map({}),
  });

  return {
    type: SET_FORM,
    form,
  };
}

export function submit() {
  return {
    type: SUBMIT,
  };
}

export function submitError(errors) {
  return {
    type: SUBMIT_ERROR,
    errors,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}
