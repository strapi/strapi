import { takeLatest } from 'redux-saga';
import { take, put, fork, cancel } from 'redux-saga/effects';
// import { FormattedMessage } from 'react-intl';
import { CONFIG_FETCH, CONFIG_FETCH_SUCCEEDED } from './constants';
import { configFetchSucceded } from './actions';

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

// Individual exports for testing
export function* defaultSaga() {
  const loadConfig = yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  yield take(CONFIG_FETCH_SUCCEEDED);
  yield cancel(loadConfig);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
