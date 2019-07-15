import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import { getLayoutSucceeded } from './actions';
import { GET_LAYOUT } from './constants';

const getRequestUrl = path => `/${pluginId}/fixtures/${path}`;

function* getLayout({ uid }) {
  try {
    const { layout } = yield call(request, getRequestUrl(`layouts/${uid}`), {
      method: 'GET',
    });

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
