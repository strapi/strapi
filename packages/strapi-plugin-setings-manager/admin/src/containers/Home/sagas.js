import { take, call, put, fork, select, cancel } from 'redux-saga/effects';
import { takeLatest } from 'redux-saga';
import { LOCATION_CHANGE } from 'react-router-redux';
import { FormattedMessage } from 'react-intl';
import { CONFIG_FETCH, ENVIRONMENTS_FETCH } from './constants';
import { configFetchSucceded, environmentsFetchSucceeded } from './actions';

export function* fetchConfig(action) {
  try {
    const opts = {
      method: 'GET',
    };

    const response = yield fetch(`/settings-manager/configurations/${action.endPoint}`, opts);
    const data = yield response.json();

    // TODO handle error
    yield put(configFetchSucceded(data));

  } catch(error) {

    window.Strapi.notification.error('An error occurred ');
  }
}

export function* fetchEnvironments() {
  try {
    const opts = {
      method: 'GET',
    };

    const response = yield fetch('/settings-manager/environments');
    const data = yield response.json();

    yield put(environmentsFetchSucceeded(data));

  } catch(error) {
    console.log(error);
  }
}


// Individual exports for testing
export function* defaultSaga() {
  const loadConfig = yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  const loadEnvironments = yield fork(takeLatest, ENVIRONMENTS_FETCH, fetchEnvironments);
  yield take(LOCATION_CHANGE);
  yield cancel(loadConfig);
  yield cancel(loadEnvironments);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
