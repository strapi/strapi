import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import { getLayoutSucceeded } from './actions';
import { GET_LAYOUT } from './constants';

const getRequestUrl = path => `/${pluginId}/${path}`;

function* getLayout({ source, uid }) {
  try {
    const params = source !== 'content-manager' ? { source } : {};
    const { data: layout } = yield call(
      request,
      getRequestUrl(`content-types/${uid}`),
      {
        method: 'GET',
        params,
      }
    );

    yield put(getLayoutSucceeded(layout, uid));
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

function* defaultSaga() {
  try {
    yield all([fork(takeLatest, GET_LAYOUT, getLayout)]);
  } catch (err) {
    // Do nothing
  }
}

export default defaultSaga;
