import { all, call, fork, put, select, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import {
  getPermissionsSucceeded,
  getPoliciesSucceeded,
  getRoleSucceeded,
  getRoutesSucceeded,
  getUserSucceeded,
  submitSucceeded,
} from './actions';
import {
  GET_PERMISSIONS,
  GET_POLICIES,
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
    const data = yield call(request, `/${pluginId}/search/${action.user}`, {
      method: 'GET',
    });

    yield put(getUserSucceeded(data));
  } catch (error) {
    strapi.notification.error(getTrad('notification.error.fetchUser'));
  }
}

export function* permissionsGet() {
  try {
    const response = yield call(request, `/${pluginId}/permissions`, {
      method: 'GET',
      params: {
        lang: strapi.currentLanguage,
      },
    });

    yield put(getPermissionsSucceeded(response));
  } catch (err) {
    strapi.notification.error(
      getTrad('EditPage.notification.permissions.error')
    );
  }
}

export function* policiesGet() {
  try {
    const [policies, routes] = yield all([
      call(request, `/${pluginId}/policies`, { method: 'GET' }),
      call(request, `/${pluginId}/routes`, { method: 'GET' }),
    ]);

    yield put(getPoliciesSucceeded(policies));
    yield put(getRoutesSucceeded(routes));
  } catch (err) {
    strapi.notification.error(getTrad('EditPage.notification.policies.error'));
  }
}

export function* roleGet(action) {
  try {
    const role = yield call(request, `/${pluginId}/roles/${action.id}`, {
      method: 'GET',
      params: {
        lang: strapi.currentLanguage,
      },
    });

    yield put(getRoleSucceeded(role));
  } catch (err) {
    strapi.notification.error(getTrad('EditPage.notification.role.error'));
  }
}

export function* submit(action) {
  try {
    const actionType = yield select(makeSelectActionType());
    const body = yield select(makeSelectModifiedData());
    const roleId = yield select(makeSelectRoleId());
    const opts = {
      method: actionType,
      body,
    };

    const requestURL =
      actionType === 'POST'
        ? `/${pluginId}/roles`
        : `/${pluginId}/roles/${roleId}`;
    const response = yield call(request, requestURL, opts);

    if (actionType === 'POST') {
      action.context.emitEvent('didCreateRole');
    }

    if (response.ok) {
      yield put(submitSucceeded());
    }
  } catch (error) {
    console.log(error); // eslint-disable-line no-console
  }
}

export default function* defaultSaga() {
  yield fork(takeLatest, GET_PERMISSIONS, permissionsGet);
  yield fork(takeLatest, GET_POLICIES, policiesGet);
  yield fork(takeLatest, GET_ROLE, roleGet);

  yield fork(takeLatest, GET_USER, fetchUser);
  yield fork(takeLatest, SUBMIT, submit);

  // yield take(LOCATION_CHANGE);

  // yield cancel(loadPermissionsWatcher);
  // yield cancel(loadPoliciesWatcher);
  // yield cancel(loadRoleWatcher);
}
