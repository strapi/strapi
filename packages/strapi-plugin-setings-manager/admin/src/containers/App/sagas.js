import { takeLatest } from 'redux-saga';
import { LOCATION_CHANGE } from 'react-router-redux';
import { put, fork } from 'redux-saga/effects';

import { fetchMenuSucceeded } from './actions';
import { MENU_FETCH } from './constants';

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


function* defaultSaga() {
  yield fork(takeLatest, MENU_FETCH, fetchMenu);
}

export default [defaultSaga];
