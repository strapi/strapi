import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { getDataSucceeded } from './actions';
import { GET_DATA } from './constants';

const getRequestUrl = path => `/${pluginId}/fixtures/${path}`;

export function* getData({ uid }) {
  try {
    const { layout } = yield call(request, getRequestUrl(`layouts/${uid}`), {
      method: 'GET',
    });

    yield put(getDataSucceeded(layout));
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

function* defaultSaga() {
  try {
    yield all([fork(takeLatest, GET_DATA, getData)]);
  } catch (err) {
    // Do nothing
  }
}

export default defaultSaga;
