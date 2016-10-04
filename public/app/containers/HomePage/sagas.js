/**
 * Gets the generalSettingsitories of the user from Github
 */

import { take, call, put, select, fork, cancel } from 'redux-saga/effects';
import { LOCATION_CHANGE } from 'react-router-redux';
import {
  LOAD_GENERAL_SETTINGS,
  UPDATE_GENERAL_SETTINGS,
}  from 'containers/HomePage/constants';

import {
  generalSettingsLoaded,
  generalSettingsLoadingError,
  generalSettingsUpdated,
  generalSettingsUpdatedError,
} from 'containers/HomePage/actions';

import {
  selectName,
  selectDescription,
  selectVersion,
} from 'containers/HomePage/selectors';

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
    values: {
      version: yield select(selectVersion()),
      name: yield select(selectName()),
      description: yield select(selectDescription()),
    },
    type: 'general',
  };

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

  if (!generalSettings.err) {
    window.Strapi.notification.success('Your settings have successfully updated.');
    yield put(generalSettingsUpdated(generalSettings.data));
  } else {
    window.Strapi.notification.error(generalSettings.err.message || 'An error occurred during settings update.');
    yield put(generalSettingsUpdatedError(generalSettings.err));
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
