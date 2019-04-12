import pluralize from 'pluralize';
import { capitalize, get, sortBy } from 'lodash';
import { all, fork, takeLatest, call, put } from 'redux-saga/effects';
import request from 'utils/request';
import pluginId from '../../pluginId';

import {
  getDataSucceeded,
  deleteModelSucceeded,
  submitContentTypeSucceeded,
  submitTempContentTypeSucceeded,
} from './actions';
import { GET_DATA, DELETE_MODEL, SUBMIT_CONTENT_TYPE, SUBMIT_TEMP_CONTENT_TYPE } from './constants';

export function* getData() {
  try {
    const requestURL = `/${pluginId}/models`;
    const [data, { connections }] = yield all([
      call(request, requestURL, { method: 'GET' }),
      call(request, `/content-type-builder/connections`, { method: 'GET' }),
    ]);

    yield put(getDataSucceeded(data, connections));
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

export function* deleteModel({ context: { plugins, updatePlugin }, modelName }) {
  try {
    const requestURL = `/${pluginId}/models/${modelName}`;
    const response = yield call(request, requestURL, { method: 'DELETE' }, true);

    if (response.ok === true) {
      strapi.notification.success(`${pluginId}.notification.success.contentTypeDeleted`);
      yield put(deleteModelSucceeded(modelName));

      const appPlugins = plugins.toJS ? plugins.toJS() : plugins;
      const appMenu = get(appPlugins, ['content-manager', 'leftMenuSections'], []);
      const updatedMenu = appMenu[0].links.filter(el => el.destination !== modelName);
      appMenu[0].links = sortBy(updatedMenu, 'label');
      updatePlugin('content-manager', 'leftMenuSections', appMenu);
    }
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

export function* submitCT({
  oldContentTypeName,
  body,
  source,
  context: { emitEvent, plugins, router, updatePlugin },
}) {
  try {
    const requestURL = `/${pluginId}/models/${oldContentTypeName}`;
    const { name } = body;

    if (source) {
      body.plugin = source;
    }

    emitEvent('willSaveContentType');

    const opts = { method: 'PUT', body };

    yield call(request, requestURL, opts, true);
    emitEvent('didSaveContentType');
    yield put(submitContentTypeSucceeded());
    router.history.push(`/plugins/${pluginId}/models/${name}`);

    if (name !== oldContentTypeName) {
      emitEvent('didEditNameOfContentType');

      const appPlugins = plugins.toJS ? plugins.toJS() : plugins;
      const appMenu = get(appPlugins, ['content-manager', 'leftMenuSections'], []);
      const oldContentTypeNameIndex = appMenu[0].links.findIndex(el => el.destination === oldContentTypeName);
      const updatedLink = {
        destination: name.toLowerCase(),
        label: capitalize(pluralize(name)),
      };
      appMenu[0].links.splice(oldContentTypeNameIndex, 1, updatedLink);
      appMenu[0].links = sortBy(appMenu[0].links, 'label');
      updatePlugin('content-manager', 'leftMenuSections', appMenu);
    }
  } catch (error) {
    const errorMessage = get(
      error,
      ['response', 'payload', 'message', '0', 'messages', '0', 'id'],
      'notification.error',
    );
    strapi.notification.error(errorMessage);
  }
}

/* istanbul ignore-next */
export function* submitTempCT({ body, context: { emitEvent, plugins, updatePlugin } }) {
  try {
    emitEvent('willSaveContentType');

    const requestURL = `/${pluginId}/models`;
    const opts = { method: 'POST', body };

    yield call(request, requestURL, opts, true);

    emitEvent('didSaveContentType');
    yield put(submitTempContentTypeSucceeded());

    const { name } = body;
    const appPlugins = plugins.toJS ? plugins.toJS() : plugins;
    const appMenu = get(appPlugins, ['content-manager', 'leftMenuSections'], []);
    const newLink = {
      destination: name.toLowerCase(),
      label: capitalize(pluralize(name)),
    };
    appMenu[0].links.push(newLink);
    appMenu[0].links = sortBy(appMenu[0].links, 'label');

    updatePlugin('content-manager', 'leftMenuSections', appMenu);
  } catch (error) {
    const errorMessage = get(
      error,
      ['response', 'payload', 'message', '0', 'messages', '0', 'id'],
      'notification.error',
    );
    strapi.notification.error(errorMessage);
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield all([
    fork(takeLatest, GET_DATA, getData),
    fork(takeLatest, DELETE_MODEL, deleteModel),
    fork(takeLatest, SUBMIT_CONTENT_TYPE, submitCT),
    fork(takeLatest, SUBMIT_TEMP_CONTENT_TYPE, submitTempCT),
  ]);
}
