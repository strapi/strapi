import { fork, call, put, select, takeLatest } from 'redux-saga/effects';

import { pluginDeleted } from 'containers/App/actions';
import request from 'utils/request';

import { deletePluginSucceeded } from './actions';
import { ON_DELETE_PLUGIN_CONFIRM } from './constants';
import { makeSelectPluginToDelete } from './selectors';

export function* deletePlugin() {
  try {
    const plugin = yield select(makeSelectPluginToDelete());
    const requestUrl = `/admin/plugins/uninstall/${plugin}`;

    const resp = yield call(request, requestUrl, { method: 'DELETE' });

    if (resp.ok) {
      yield put(deletePluginSucceeded());
      yield put(pluginDeleted(plugin));
    }

  } catch(error) {
    yield put(deletePluginSucceeded());
    window.Strapi.notification.error('app.components.listPluginsPage.deletePlugin.error');
  }
}
// Individual exports for testing
export default function* defaultSaga() {
  yield fork(takeLatest, ON_DELETE_PLUGIN_CONFIRM, deletePlugin);
}
