/**
 * Gets the generalSettingsitories of the user from Github
 */

import { take, call, put, select, fork, cancel } from 'redux-saga/effects';
import { LOCATION_CHANGE } from 'react-router-redux';
import { LOAD_GENERAL_SETTINGS }  from 'containers/HomePage/constants';
import { generalSettingsLoaded, generalSettingsLoadingError } from 'containers/HomePage/actions';

import request from 'utils/request';

/**
 * Github generalSettings request/response handler
 */
export function* getGeneralSettings() {
  // Select username from store
  const requestURL = `http://localhost:1337/settingsmanager/settings/general`;

  // Call our request helper (see 'utils/request')
  const generalSettings = yield call(request, requestURL);

  if (!generalSettings.err) {
    yield put(generalSettingsLoaded(generalSettings.data));
  } else {
    yield put(repoLoadingError(generalSettings.err));
  }
}

/**
 * Watches for LOAD_REPOS action and calls handler
 */
export function* getGeneralSettingsWatcher() {
  while (yield take(LOAD_GENERAL_SETTINGS)) {
    yield call(getGeneralSettings);
  }
}

/**
 * Root saga manages watcher lifecycle
 */
export function* generalSettingsData() {
  // Fork watcher so we can continue execution
  const watcher = yield fork(getGeneralSettingsWatcher);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);
  yield cancel(watcher);
}

// Bootstrap sagas
export default [
  generalSettingsData,
];
