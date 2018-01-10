import { get } from 'lodash';
import { fork, call, put, select, takeLatest } from 'redux-saga/effects';
import { pluginDeleted } from 'containers/App/actions';
import auth from 'utils/auth';
import request from 'utils/request';

import { selectLocale } from '../LanguageProvider/selectors';
import { deletePluginSucceeded, getPluginsSucceeded } from './actions';
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

  } catch(error) {
    yield put(deletePluginSucceeded(false));
    strapi.notification.error('app.components.listPluginsPage.deletePlugin.error');
  }
}

export function* pluginsGet() {
  try {
    // Fetch plugins.
    const response = yield call(request, '/admin/plugins', { method: 'GET' });
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

    // Fetch plugins informations.
    const availablePlugins = yield call(request, 'https://marketplace.strapi.io/plugins', opts);

    // Add logo URL to object.
    Object.keys(response.plugins).map(name => {
      response.plugins[name].logo = get(availablePlugins.find(plugin => plugin.id === name), 'logo', '');
    });

    yield put(getPluginsSucceeded(response));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield fork(takeLatest, ON_DELETE_PLUGIN_CONFIRM, deletePlugin);
  yield fork(takeLatest, GET_PLUGINS, pluginsGet);
}
