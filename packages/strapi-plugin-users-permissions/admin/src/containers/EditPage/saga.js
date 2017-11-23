import { LOCATION_CHANGE } from 'react-router-redux';
import { includes, toLower } from 'lodash';
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
  getUserSucceeded,
  submitSucceeded,
} from './actions';

import {
  GET_PERMISSIONS,
  GET_ROLE,
  GET_USER,
  SUBMIT,
} from './constants';

import {
  makeSelectActionType,
  makeSelectModifiedData,
  makeSelectRoleId,
} from './selectors';

export function* fetchUser(action) {
  try {
    const fakeUser = [
      {
        id: '11',
        name: 'John Lennon',
      },
      {
        id: '12',
        name: 'Paul McCartney',
      },
      {
        id: '13',
        name: 'George Harrison',
      },
      {
        id: '14',
        name: 'Ringo Starr',
      },
    ];
    // Temporary waiting for backend dynamic
    const filteredUsers = fakeUser.filter((user) => {
      if (includes(toLower(user.name), toLower(action.user))) {
        return user;
      }
    });

    yield put(getUserSucceeded(filteredUsers));
  } catch(error) {
    strapi.notification.error('users-permissions.notification.error.fetchUser');
  }
}

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
    const roleId = yield select(makeSelectRoleId());
    const opts = {
      method: actionType,
      body,
    };

    const requestURL = actionType === 'POST' ? '/users-permissions/roles' : `/users-permissions/roles/${roleId}`;

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

  yield fork(takeLatest, GET_USER, fetchUser);
  yield fork(takeLatest, SUBMIT, submit);

  yield take(LOCATION_CHANGE);

  yield cancel(loadPermissionsWatcher);
  yield cancel(loadRoleWatcher);
}
