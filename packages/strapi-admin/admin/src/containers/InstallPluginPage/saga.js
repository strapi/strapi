import { LOCATION_CHANGE } from 'react-router-redux';
import {
  call,
  cancel,
  fork,
  put,
  select,
  take,
  takeLatest,
} from 'redux-saga/effects';

import request from 'utils/request';

import { selectLocale } from '../LanguageProvider/selectors';
import {
  downloadPluginError,
  downloadPluginSucceeded,
  getAvailablePluginsSucceeded,
  getInstalledPluginsSucceeded,
} from './actions';
import { DOWNLOAD_PLUGIN, GET_AVAILABLE_PLUGINS, GET_INSTALLED_PLUGINS } from './constants';
import { makeSelectPluginToDownload } from './selectors';


export function* pluginDownload() {
  try {
    const pluginToDownload = yield select(makeSelectPluginToDownload());
    const opts = {
      method: 'POST',
      body: {
        plugin: pluginToDownload,
        port: window.location.port,
      },
    };
    const response = yield call(request, '/admin/plugins/install', opts, true);

    if (response.ok) {

      yield new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, 8000);
      });

      yield put(downloadPluginSucceeded());
      window.location.reload();
    }
  } catch(err) {
    yield put(downloadPluginError());
  }
}

export function* getAvailablePlugins() {
  try {
    // Get current locale.
    const locale = yield select(selectLocale());

    const opts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        lang: locale,
      },
    };

    let availablePlugins;

    try {
      // Retrieve plugins list.
      availablePlugins = yield call(request, 'https://marketplace.strapi.io/plugins', opts);
    } catch (e) {
      availablePlugins = [];
    }

    yield put(getAvailablePluginsSucceeded(availablePlugins));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

export function* getInstalledPlugins() {
  try {
    const opts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    let installedPlugins;

    try {
      // Retrieve plugins list.
      installedPlugins = yield call(request, '/admin/plugins', opts);
    } catch (e) {
      installedPlugins = [];
    }

    yield put(getInstalledPluginsSucceeded(Object.keys(installedPlugins.plugins)));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  const loadAvailablePluginsWatcher = yield fork(takeLatest, GET_AVAILABLE_PLUGINS, getAvailablePlugins);
  const loadInstalledPluginsWatcher = yield fork(takeLatest, GET_INSTALLED_PLUGINS, getInstalledPlugins);
  yield fork(takeLatest, DOWNLOAD_PLUGIN, pluginDownload);

  yield take(LOCATION_CHANGE);

  yield cancel(loadAvailablePluginsWatcher);
  yield cancel(loadInstalledPluginsWatcher);
}
