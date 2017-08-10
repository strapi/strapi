import { LOCATION_CHANGE } from 'react-router-redux';

import { forEach, set, join, split, toLower, upperCase } from 'lodash';
import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel, select } from 'redux-saga/effects';
import request from 'utils/request';

// selectors
import { makeSelectModifiedData } from './selectors';

import {
  CONFIG_FETCH,
  EDIT_SETTINGS,
  LANGUAGE_DELETE,
  LANGUAGES_FETCH,
  NEW_LANGUAGE_POST,
  DATABASES_FETCH,
  NEW_DATABASE_POST,
  DATABASE_DELETE,
  SPECIFIC_DATABASE_FETCH,
  DATABASE_EDIT,
} from './constants';

import {
  configFetchSucceded,
  databasesFetchSucceeded,
  editSettingsSucceeded,
  languagesFetchSucceeded,
  languageActionError,
  databaseActionSucceeded,
  specificDatabaseFetchSucceeded,
  databaseActionError,
} from './actions';

export function* editDatabase(action) {
  try {
    const body = {};

    forEach(action.data, (value, key) => {
      set(body, key, value);
    });

    const opts = {
      method: 'PUT',
      body,
    };

    const requestUrl = `/settings-manager/configurations/databases/${action.apiUrl}`;

    yield call(request, requestUrl, opts);

    // TODO remove counter
    yield new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 4000);
    });

    yield put(databaseActionSucceeded());

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export function* deleteDatabase(action) {
  try {
    const opts = { method: 'DELETE' };

    const requestUrl = `settings-manager/configurations/databases/${action.databaseToDelete}/${action.endPoint}`;

    yield call(request, requestUrl, opts);

    // TODO remove counter
    yield new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 4000);
    });


  } catch(error) {
    yield put(databaseActionError());
    window.Strapi.notification.error('an error occured');
  }
}

export function* deleteLanguage(action) {
  try {
    const opts = {
      method: 'DELETE',
    };

    const requestUrl = `/settings-manager/configurations/languages/${action.languageToDelete}`;

    yield call(request, requestUrl, opts);

    window.Strapi.notification.success('Deleting language...');

  } catch(error) {

    yield put(languageActionError());
    window.Strapi.notification.error('An Error occured');
  }
}

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


export function* fetchDatabases(action) {
  try {
    const opts = {
      method: 'GET',
    };

    const requestUrlListDatabases = `/settings-manager/configurations/databases/${action.environment}`;
    const requestUrlAppDatabases = '/settings-manager/configurations/database/model';

    const [listDatabasesData, appDatabaseData] = yield [
      call(request, requestUrlListDatabases, opts),
      call(request, requestUrlAppDatabases, opts),
    ];

    yield put(databasesFetchSucceeded(listDatabasesData, appDatabaseData));

  } catch(error) {
    window.Strapi.notification.error('An error occurred');
  }
}

export function* fetchLanguages() {
  try {
    const opts = {
      method: 'GET',
    };

    const requestUrlAppLanguages = '/settings-manager/configurations/languages';
    const requestUrlListLanguages = '/settings-manager/configurations/i18n';

    const [appLanguagesData, listLanguagesData] = yield [
      call(request, requestUrlAppLanguages, opts),
      call(request, requestUrlListLanguages, opts),
    ];

    yield put(languagesFetchSucceeded(appLanguagesData, listLanguagesData));

  } catch(error) {
    window.Strapi.notification.error('An error occurred');
  }
}

export function* postLanguage() {
  try {
    const newLanguage = yield select(makeSelectModifiedData());
    const languageArray = [];

    forEach(split(newLanguage['language.defaultLocale'], '_'), (value, key) => {
      if (key === 0){
        languageArray.push(toLower(value));
      } else {
        languageArray.push(upperCase(value));
      }
    });

    const body = {
      name: join(languageArray, '_'),
    };
    const opts = {
      body,
      method: 'POST',
    };

    const requestUrl = '/settings-manager/configurations/languages';

    yield call(request, requestUrl, opts);

    window.Strapi.notification.success('Adding a new language...');

  } catch(error) {
    yield put(languageActionError());
    window.Strapi.notification.error(error);
  }
}

export function* postDatabase(action) {
  try {

    const body = {};

    forEach(action.data, (value, key) => {
      set(body, key, value);
    });

    const opts = {
      method: 'POST',
      body,
    };

    const requestUrl = `/settings-manager/configurations/databases/${action.endPoint}`;

    yield call(request, requestUrl, opts);

    // TODO remove counter
    yield new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 3000);
    });

    yield put(databaseActionSucceeded());
    window.Strapi.notification.success('New Database added');

  } catch(error) {
    window.Strapi.notification.error('An error occured');
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
    yield put(editSettingsSucceeded());

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export function* fetchSpecificDatabase(action) {
  try {
    const opts = {
      method: 'GET',
    };

    const requestUrl = `/settings-manager/configurations/databases/${action.databaseName}/${action.endPoint}`;

    const data = yield call(request, requestUrl, opts);

    yield put(specificDatabaseFetchSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadConfigWatcher = yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
  const loadLanguagesWatcher = yield fork(takeLatest, LANGUAGES_FETCH, fetchLanguages);
  const editConfigWatcher = yield fork(takeLatest, EDIT_SETTINGS, settingsEdit);
  const postLanguageWatcher = yield fork(takeLatest, NEW_LANGUAGE_POST, postLanguage);
  const deleteLanguageWatcher = yield fork(takeLatest, LANGUAGE_DELETE, deleteLanguage);
  const loadDatabasesWatcher = yield fork(takeLatest, DATABASES_FETCH, fetchDatabases);
  const postDatabaseWatcher = yield fork(takeLatest, NEW_DATABASE_POST, postDatabase);
  const deleteDatabaseWatcher = yield fork(takeLatest, DATABASE_DELETE, deleteDatabase);
  const fetchSpecificDatabaseWatcher = yield fork(takeLatest, SPECIFIC_DATABASE_FETCH, fetchSpecificDatabase);
  const editDatabaseWatcher = yield fork(takeLatest, DATABASE_EDIT, editDatabase);

  yield take(LOCATION_CHANGE);
  yield cancel(loadConfigWatcher);
  yield cancel(loadLanguagesWatcher);
  yield cancel(editConfigWatcher);
  yield cancel(postLanguageWatcher);
  yield cancel(deleteLanguageWatcher);
  yield cancel(loadDatabasesWatcher);
  yield cancel(postDatabaseWatcher);
  yield cancel(deleteDatabaseWatcher);
  yield cancel(fetchSpecificDatabaseWatcher);
  yield cancel(editDatabaseWatcher);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
