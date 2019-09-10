import { fork, takeLatest, call, put } from 'redux-saga/effects';

import { request } from 'strapi-helper-plugin';

import { INITIALIZE } from './constants';
import { initializeSucceeded } from './actions';

export function* initialize() {
  try {
    const requestURL = '/users-permissions/init';

    const { hasAdmin } = yield call(request, requestURL, { method: 'GET' });

    yield put(initializeSucceeded(hasAdmin));
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  // See example in containers/HomePage/saga.js
  yield fork(takeLatest, INITIALIZE, initialize);
}
