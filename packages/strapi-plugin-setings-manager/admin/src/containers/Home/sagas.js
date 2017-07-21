import { LOCATION_CHANGE } from 'react-router-redux';

import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel } from 'redux-saga/effects';

import request from 'utils/request';

import { CONFIG_FETCH, LANGUAGES_FETCH } from './constants';
import { configFetchSucceded, languagesFetchSucceeded } from './actions';

export function* fetchConfig(action) {
  try {
    const opts = {
      method: 'GET',
    };

    const requestUrl = `/settings-manager/configurations/${action.endPoint}`;
    const data = yield call(request, requestUrl, opts);

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

    const requestUrlappLanguages = '/settings-manager/configurations/languages';
    const requestUrlListLanguages = '/settings-manager/configurations/i18n';

    const appLanguagesData = yield call(request, requestUrlappLanguages, opts);
    const listLanguagesData = yield call(request, requestUrlListLanguages, opts);

    yield put(languagesFetchSucceeded(appLanguagesData, listLanguagesData));

  } catch(error) {
    window.Strapi.notification.error('An error occurred');
  }
}


// Individual exports for testing
export function* defaultSaga() {
  const loadConfig = yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  const loadLanguages = yield fork(takeLatest, LANGUAGES_FETCH, fetchLanguages);

  yield take(LOCATION_CHANGE);
  yield cancel(loadConfig);
  yield cancel(loadLanguages);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
