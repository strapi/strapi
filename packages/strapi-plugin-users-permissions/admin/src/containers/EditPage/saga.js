import { LOCATION_CHANGE } from 'react-router-redux';
import {
  call,
  cancel,
  fork,
  put,
  select,
  take,
  takeLatest,
} from 'redux-saga/effects';
import request from 'utils/request';

import {
  getPermissionsSucceeded,
  getRoleSucceeded,
  submitSucceeded,
} from './actions';

import {
  GET_PERMISSIONS,
  GET_ROLE,
  SUBMIT,
} from './constants';

import {
  makeSelectActionType,
  makeSelectModifiedData,
} from './selectors';

export function* permissionsGet() {
  try {
    const response = yield call(request, '/users-permissions/permissions', { method: 'GET' });
    yield put(getPermissionsSucceeded(response));
  } catch(err) {
    strapi.notification.error('users-permissions.EditPage.notification.permissions.error');
  }
}

export function* roleGet(action) {
  try {
    const role = yield call(request, `/users-permissions/roles/${action.id}`, { method: 'GET' });

    yield put(getRoleSucceeded(role));
  } catch(err) {
    strapi.notification.error('users-permissions.EditPage.notification.role.error');
  }
}

export function* submit() {
  try {
    const actionType = yield select(makeSelectActionType());
    const body = yield select(makeSelectModifiedData());
    const opts = {
      method: actionType,
      body,
    };

    // TODO : handle PUT url
    const requestURL = actionType === 'POST' ? '/users-permissions/roles' : '/users-permissions/roles/id';
    yield call(request, requestURL, opts);

    yield put(submitSucceeded());

  } catch(error) {
    console.log(error.response.payload);
    // TODO handle error message
  }
}

export default function* defaultSaga() {
  const loadPermissionsWatcher = yield fork(takeLatest, GET_PERMISSIONS, permissionsGet);
  const loadRoleWatcher = yield fork(takeLatest, GET_ROLE, roleGet);

  yield fork(takeLatest, SUBMIT, submit);
  yield take(LOCATION_CHANGE);

  yield cancel(loadPermissionsWatcher);
  yield cancel(loadRoleWatcher);
}
