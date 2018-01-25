import { LOCATION_CHANGE } from 'react-router-redux';
import { forEach, set, map, replace } from 'lodash';
import { call, take, put, fork, cancel, select, takeLatest } from 'redux-saga/effects';
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
  languageActionSucceeded,
  databaseActionSucceeded,
  specificDatabaseFetchSucceeded,
  databaseActionError,
  unsetLoader,
  setLoader,
} from './actions';

/* eslint-disable no-template-curly-in-string */

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

    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      strapi.notification.success('settings-manager.strapi.notification.success.databaseEdit');
      yield put(databaseActionSucceeded());
    }
  } catch(error) {
    const formErrors = map(error.response.payload.message, err => ({ target: err.target, errors: map(err.messages, mess => ({ id: `settings-manager.${mess.id}`})) }));

    yield put(databaseActionError(formErrors));
    strapi.notification.error('settings-manager.strapi.notification.error');
  }
}

export function* deleteDatabase(action) {
  try {
    const opts = { method: 'DELETE' };
    const requestUrl = `/settings-manager/configurations/databases/${action.databaseToDelete}/${action.endPoint}`;

    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      yield call(action.context.disableGlobalOverlayBlocker);
      strapi.notification.success('settings-manager.strapi.notification.success.databaseDeleted');
    }
  } catch(error) {
    yield call(action.context.disableGlobalOverlayBlocker);
    yield put(databaseActionError([]));
    strapi.notification.error('settings-manager.strapi.notification.error');
  }
}

export function* deleteLanguage(action) {
  try {
    const opts = {
      method: 'DELETE',
    };
    const requestUrl = `/settings-manager/configurations/languages/${action.languageToDelete}`;
    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      strapi.notification.success('settings-manager.strapi.notification.success.languageDelete');
    }
  } catch(error) {
    yield put(languageActionError());
    strapi.notification.error('settings-manager.strapi.notification.error');
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
    strapi.notification.error('settings-manager.strapi.notification.error');
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
    strapi.notification.error('settings-manager.strapi.notification.error');
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
    strapi.notification.error('settings-manager.strapi.notification.error');
  }
}

export function* postLanguage() {
  try {
    const newLanguage = yield select(makeSelectModifiedData());
    const body = {
      name: newLanguage['language.defaultLocale'],
    };
    const opts = {
      body,
      method: 'POST',
    };
    const requestUrl = '/settings-manager/configurations/languages';
    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      yield put(languageActionSucceeded());
      strapi.notification.success('settings-manager.strapi.notification.success.languageAdd');
    }
  } catch(error) {
    yield put(languageActionError());
    strapi.notification.error('settings-manager.strapi.notification.error');
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
    const resp = yield call(request, requestUrl, opts, true);

    if (resp.ok) {
      yield put(databaseActionSucceeded());
      strapi.notification.success('settings-manager.strapi.notification.success.databaseAdd');
    }
  } catch(error) {
    const formErrors = map(error.response.payload.message, (err) => {
      const target = err.target ? replace(err.target, err.target.split('.')[2], '${name}') : 'database.connections.${name}.name';
      return (
        { target, errors: map(err.messages, mess => ({ id: `settings-manager.${mess.id}`})) }
      );
    });

    yield put(databaseActionError(formErrors));
    strapi.notification.error('settings-manager.strapi.notification.error');
  }
}

export function* settingsEdit(action) {
  try {
    // Show button loader
    yield put(setLoader());

    const opts = {
      body: action.newSettings,
      method: 'PUT',
    };
    const requestUrl = `/settings-manager/configurations/${action.endPoint}`;
    const resp = yield  call(request, requestUrl, opts, true);

    if (resp.ok) {
      yield put(editSettingsSucceeded());
      strapi.notification.success('settings-manager.strapi.notification.success.settingsEdit');
    }
  } catch(error) {
    strapi.notification.error('settings-manager.strapi.notification.error');
  } finally {
    yield put(unsetLoader());
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
    strapi.notification.error('settings-manager.strapi.notification.error');
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
export default defaultSaga;
