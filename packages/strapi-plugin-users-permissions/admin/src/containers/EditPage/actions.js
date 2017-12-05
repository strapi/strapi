/*
 *
 * EditPage actions
 *
 */
import { fromJS, List, Map } from 'immutable';
import { get, replace, toString } from 'lodash';
import {
  ADD_USER,
  GET_PERMISSIONS,
  GET_PERMISSIONS_SUCCEEDED,
  GET_POLICIES,
  GET_POLICIES_SUCCEEDED,
  GET_ROLE,
  GET_ROLE_SUCCEEDED,
  GET_ROUTES_SUCCEEDED,
  GET_USER,
  GET_USER_SUCCEEDED,
  ON_CANCEL,
  ON_CHANGE_INPUT,
  ON_CLICK_ADD,
  ON_CLICK_DELETE,
  RESET_SHOULD_DISPLAY_POLICIES_HINT,
  SELECT_ALL_ACTIONS,
  SET_ACTION_TYPE,
  SET_ERRORS,
  SET_FORM,
  SET_INPUT_POLICIES_PATH,
  SET_ROLE_ID,
  SET_SHOULD_DISPLAY_POLICIES_HINT,
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


export function getPolicies() {
  return {
    type: GET_POLICIES,
  };
}

export function getPoliciesSucceeded(policies) {
  const formattedPolicies = policies.policies.reduce((acc, current) => {
    acc.push({ value: current });

    return acc;
  },[]);

  return {
    type: GET_POLICIES_SUCCEEDED,
    policies: [{ name: 'users-permissions.Policies.InputSelect.empty', value: '' }].concat(formattedPolicies),
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

export function getRoutesSucceeded(routes) {
  return {
    type: GET_ROUTES_SUCCEEDED,
    routes,
  };
}

export function getUser(user) {
  return {
    type: GET_USER,
    user,
  };
}

export function getUserSucceeded(users) {
  return {
    type: GET_USER_SUCCEEDED,
    users: users.filter(o => toString(o.role) !== '0'),
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

export function onClickAdd(itemToAdd) {
  return {
    type: ON_CLICK_ADD,
    itemToAdd,
  };
}

export function onClickDelete(itemToDelete) {
  return {
    type: ON_CLICK_DELETE,
    itemToDelete,
  };
}

export function resetShouldDisplayPoliciesHint() {
  return {
    type: RESET_SHOULD_DISPLAY_POLICIES_HINT,
  };
}

export function selectAllActions(name, shouldEnable) {
  return {
    type: SELECT_ALL_ACTIONS,
    keys: ['modifiedData'].concat(name.split('.')),
    shouldEnable,
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

export function setInputPoliciesPath(path) {
  const inputPath = replace(path, 'enabled', 'policy');

  return {
    type: SET_INPUT_POLICIES_PATH,
    inputPath,
  };
}

export function setRoleId(roleId) {
  return {
    type: SET_ROLE_ID,
    roleId,
  };
}

export function setShouldDisplayPolicieshint() {
  return {
    type: SET_SHOULD_DISPLAY_POLICIES_HINT,
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
