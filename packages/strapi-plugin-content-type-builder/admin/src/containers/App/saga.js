import { all, fork, takeLatest, call, put } from 'redux-saga/effects';
import request from 'utils/request';
import pluginId from '../../pluginId';

import {  getDataSucceeded, deleteModelSucceeded } from './actions';
import { GET_DATA, DELETE_MODEL } from './constants';

export function* getData() {
  try {
    const requestURL = `/${pluginId}/models`;
    const [data, { connections }] = yield all([
      call(request, requestURL, { method: 'GET' }),
      call(request, `/content-type-builder/connections`, { method: 'GET' }),
    ]);

    yield put(getDataSucceeded(data, connections));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

export function* deleteModel({ modelName }) {
  try {
    const requestURL = `/${pluginId}/models/${modelName}`;
    const response = yield call(request, requestURL, { method: 'DELETE' }, true);

    if (response.ok === true) {
      strapi.notification.success(`${pluginId}.notification.success.contentTypeDeleted`);
      yield put(deleteModelSucceeded(modelName));
    }
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield all([
    fork(takeLatest, GET_DATA, getData),
    fork(takeLatest, DELETE_MODEL, deleteModel),
  ]);
}
