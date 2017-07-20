import { takeLatest } from 'redux-saga';
import { put, fork, take, cancel } from 'redux-saga/effects';

import { fetchMenuSucceeded, environmentsFetchSucceeded } from './actions';
import { MENU_FETCH, MENU_FETCH_SUCCEEDED, ENVIRONMENTS_FETCH, ENVIRONMENTS_FETCH_SUCCEEDED } from './constants';

export function* fetchMenu() {
  try {
    const opts = {
      method: 'GET',
    };
    const response = yield fetch('/settings-manager/menu', opts);
    const data = yield response.json();

    yield put(fetchMenuSucceeded(data));

  } catch(err) {
    window.Strapi.notification.error(
      'An error occurred.'
    );
  }
}

export function* fetchEnvironments() {
  try {
    const opts = {
      method: 'GET',
    };

    const response = yield fetch('/settings-manager/configurations/environments', opts);
    const data = yield response.json();

    yield put(environmentsFetchSucceeded(data));

  } catch(error) {
    console.log(error);
  }
}


function* defaultSaga() {
  const loadMenu = yield fork(takeLatest, MENU_FETCH, fetchMenu);
  const loadEnvironments = yield fork(takeLatest, ENVIRONMENTS_FETCH, fetchEnvironments);
  yield take(MENU_FETCH_SUCCEEDED);
  yield cancel(loadMenu);
  yield take(ENVIRONMENTS_FETCH_SUCCEEDED);
  yield cancel(loadEnvironments)

}

export default [defaultSaga];
