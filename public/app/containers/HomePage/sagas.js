/**
 * Gets the generalSettingsitories of the user from Github
 */

import { take, call, put, select, fork, cancel } from 'redux-saga/effects';
import { LOCATION_CHANGE } from 'react-router-redux';
import {
  LOAD_GENERAL_SETTINGS,
  UPDATE_GENERAL_SETTINGS,
}  from 'containers/HomePage/constants';
import { generalSettingsLoaded, generalSettingsLoadingError } from 'containers/HomePage/actions';
import { selectName } from 'containers/HomePage/selectors';

import request from 'utils/request';

/**
 * Github generalSettings request/response handler
 */
export function* getGeneralSettings() {
  const requestURL = `http://localhost:1337/settingsmanager/settings/general`;

  // Call our request helper (see 'utils/request')
  const generalSettings = yield call(request, requestURL);

  if (!generalSettings.err) {
    yield put(generalSettingsLoaded(generalSettings.data));
  } else {
    yield put(repoLoadingError(generalSettings.err));
  }
}

export function* updateGeneralSettings() {
  const data = {
    name: yield select(selectName()),
  };

  console.log('data', data);

  const requestURL = `http://localhost:1337/settingsmanager/settings`;

  // Call our request helper (see 'utils/request')
  const generalSettings = yield call(
    request,
    requestURL, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    }
  );
}

/**
 * Watches for LOAD_REPOS action and calls handler
 */
export function* getGeneralSettingsWatcher() {
  while (yield take(LOAD_GENERAL_SETTINGS)) {
    yield call(getGeneralSettings);
  }
}

export function* updateGeneralSettingsWatcher() {
  while (yield take(UPDATE_GENERAL_SETTINGS)) {
    yield call(updateGeneralSettings);
  }
}

/**
 * Root saga manages watcher lifecycle
 */
export function* generalSettingsData() {
  // Fork watcher so we can continue execution

  const watcher = yield fork(getGeneralSettingsWatcher);
  const updateWatcher = yield fork(updateGeneralSettingsWatcher);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);
  yield cancel(watcher);
}

// Bootstrap sagas
export default [
  generalSettingsData,
];
