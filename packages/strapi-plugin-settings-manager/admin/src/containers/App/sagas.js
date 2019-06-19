import { takeLatest, call, put, fork, take, cancel } from 'redux-saga/effects';

import { request } from 'strapi-helper-plugin';

import { fetchMenuSucceeded, environmentsFetchSucceeded } from './actions';
import {
  MENU_FETCH,
  MENU_FETCH_SUCCEEDED,
  ENVIRONMENTS_FETCH,
  ENVIRONMENTS_FETCH_SUCCEEDED,
} from './constants';

export function* fetchMenu() {
  try {
    const opts = {
      method: 'GET',
    };

    const requestUrl = '/settings-manager/menu';
    const data = yield call(request, requestUrl, opts);

    yield put(fetchMenuSucceeded(data));
  } catch (err) {
    strapi.notification.error('settings-manager.strapi.notification.error');
  }
}

export function* fetchEnvironments() {
  try {
    const opts = {
      method: 'GET',
    };

    const requestUrl = '/settings-manager/configurations/environments';
    const data = yield call(request, requestUrl, opts);

    yield put(environmentsFetchSucceeded(data));
  } catch (error) {
    strapi.notification.error('settings-manager.strapi.notification.error');
  }
}

function* defaultSaga() {
  const loadMenu = yield fork(takeLatest, MENU_FETCH, fetchMenu);
  const loadEnvironments = yield fork(
    takeLatest,
    ENVIRONMENTS_FETCH,
    fetchEnvironments,
  );
  yield take(MENU_FETCH_SUCCEEDED);
  yield cancel(loadMenu);
  yield take(ENVIRONMENTS_FETCH_SUCCEEDED);
  yield cancel(loadEnvironments);
}

export default defaultSaga;
