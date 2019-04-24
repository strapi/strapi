import { get } from 'lodash';
import { all, fork, call, put, select, takeLatest } from 'redux-saga/effects';
import { auth, request } from 'strapi-helper-plugin';
import { pluginDeleted } from '../App/actions';
import { selectLocale } from '../LanguageProvider/selectors';
import {
  deletePluginSucceeded,
  getAppCurrentEnvSucceeded,
  getPluginsSucceeded,
} from './actions';
import { GET_PLUGINS, ON_DELETE_PLUGIN_CONFIRM } from './constants';
import { makeSelectPluginToDelete } from './selectors';

export function* deletePlugin() {
  try {
    const plugin = yield select(makeSelectPluginToDelete());

    const requestUrl = `/admin/plugins/uninstall/${plugin}`;

    const resp = yield call(request, requestUrl, { method: 'DELETE' });

    if (resp.ok) {
      yield put(deletePluginSucceeded(plugin));
      yield put(pluginDeleted(plugin));

      if (plugin === 'users-permissions') {
        auth.clearAppStorage();
      }
    }
  } catch (error) {
    yield put(deletePluginSucceeded(false));
    strapi.notification.error(
      'app.components.listPluginsPage.deletePlugin.error',
    );
  }
}

export function* pluginsGet() {
  try {
    // Fetch plugins.
    const response = yield all([
      call(request, '/admin/plugins', { method: 'GET' }),
      call(request, '/admin/currentEnvironment', { method: 'GET' }),
    ]);
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
      // Fetch plugins informations.
      availablePlugins = yield call(
        request,
        'https://marketplace.strapi.io/plugins',
        opts,
      );
    } catch (e) {
      availablePlugins = [];
    }

    // Add logo URL to object.
    Object.keys(response[0].plugins).map(name => {
      response[0].plugins[name].logo = get(
        availablePlugins.find(plugin => plugin.id === name),
        'logo',
        '',
      );
    });

    yield put(getPluginsSucceeded(response[0]));
    yield put(getAppCurrentEnvSucceeded(response[1].currentEnvironment));
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield fork(takeLatest, ON_DELETE_PLUGIN_CONFIRM, deletePlugin);
  yield fork(takeLatest, GET_PLUGINS, pluginsGet);
}
