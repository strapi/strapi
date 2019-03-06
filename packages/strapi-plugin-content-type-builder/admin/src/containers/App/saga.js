import { all, fork, takeLatest, call, put } from 'redux-saga/effects';
import request from 'utils/request';
import pluginId from '../../pluginId';

import {  getDataSucceeded } from './actions';
import { GET_DATA } from './constants';

export function* getData() {
  try {
    const requestURL = `/${pluginId}/models`;
    const data = yield call(request, requestURL, { method: 'GET' });

    yield put(getDataSucceeded(data));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield all([
    fork(takeLatest, GET_DATA, getData),
  ]);
}
