import { LOCATION_CHANGE } from 'react-router-redux';

import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel } from 'redux-saga/effects';

import request from 'utils/request';

import {
  CONFIG_FETCH,
  LANGUAGES_FETCH,
  EDIT_SETTINGS,
} from './constants';

import {
  configFetchSucceded,
  languagesFetchSucceeded,
  // editSettingsSucceeded,
} from './actions';

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

    const [appLanguagesData, listLanguagesData] = yield [
      call(request, requestUrlappLanguages, opts),
      call(request, requestUrlListLanguages, opts)
    ];

    yield put(languagesFetchSucceeded(appLanguagesData, listLanguagesData));

  } catch(error) {
    window.Strapi.notification.error('An error occurred');
  }
}

export function* settingsEdit(action) {
  try {
    const opts = {
      body: action.newSettings,
      method: 'PUT',
    };

    const requestUrl = `settings-manager/configurations/${action.endPoint}`;

    yield  call(request, requestUrl, opts);



    // TODO handle server reload to get response
    window.Strapi.notification.success('Your modifications have been updated');

    // TODO uncomment following
    // const data = yield call(request, requestUrl, { method: 'GET' });

    // yield put(editSettingsSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadConfigWatcher = yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  const loadLanguagesWatcher = yield fork(takeLatest, LANGUAGES_FETCH, fetchLanguages);
  const editConfigWatcher = yield fork(takeLatest, EDIT_SETTINGS, settingsEdit);

  yield take(LOCATION_CHANGE);
  yield cancel(loadConfigWatcher);
  yield cancel(loadLanguagesWatcher);
  yield cancel(editConfigWatcher);

}

// All sagas to be loaded
export default [
  defaultSaga,
];
