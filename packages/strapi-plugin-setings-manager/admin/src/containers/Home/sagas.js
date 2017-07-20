import { LOCATION_CHANGE } from 'react-router-redux';
import { takeLatest } from 'redux-saga';
import { take, put, fork, cancel } from 'redux-saga/effects';

import { CONFIG_FETCH, LANGUAGES_FETCH } from './constants';
import { configFetchSucceded, languagesFetchSucceeded } from './actions';

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


export function* fetchLanguages() {
  try {
    const opts = {
      method: 'GET',
    };

    const appLanguagesResponse = yield fetch('/settings-manager/configurations/languages', opts);
    const allLanguagesResponse = yield fetch('/settings-manager/configurations/i18n', opts);

    const appLanguagesData = yield appLanguagesResponse.json();
    const allLanguagesData = yield allLanguagesResponse.json();

    yield put(languagesFetchSucceeded(appLanguagesData, allLanguagesData));

  } catch(error) {
    console.log(error)
    window.Strapi.notification.error('An error occurred');
  }
}


// Individual exports for testing
export function* defaultSaga() {
  const loadConfig = yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  const loadLanguages = yield fork(takeLatest, LANGUAGES_FETCH, fetchLanguages);

  yield take(LOCATION_CHANGE)
  yield cancel(loadConfig)
  yield cancel(loadLanguages)
}

// All sagas to be loaded
export default [
  defaultSaga,
];
