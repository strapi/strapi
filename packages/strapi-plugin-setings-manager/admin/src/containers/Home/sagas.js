import { takeLatest } from 'redux-saga';
import { take, put, fork, cancel } from 'redux-saga/effects';
// import { FormattedMessage } from 'react-intl';
import { CONFIG_FETCH, ENVIRONMENTS_FETCH, CONFIG_FETCH_SUCCEEDED, ENVIRONMENTS_FETCH_SUCCEEDED } from './constants';
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

    const response = yield fetch('/settings-manager/environments', opts);
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
  yield take(CONFIG_FETCH_SUCCEEDED);
  yield cancel(loadConfig);
  yield take(ENVIRONMENTS_FETCH_SUCCEEDED);
  yield cancel(loadEnvironments);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
