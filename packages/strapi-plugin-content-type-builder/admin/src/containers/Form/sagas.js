import { LOCATION_CHANGE } from 'react-router-redux';

import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel } from 'redux-saga/effects';

import request from 'utils/request';

import {
  connectionsFetchSucceeded,
  contentTypeFetchSucceeded,
} from './actions';

import {
  CONNECTIONS_FETCH,
  CONTENT_TYPE_FETCH,
} from './constants';

export function* fetchConnections() {
  try {
    const requestUrl = '/content-type-builder/connections';

    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(connectionsFetchSucceeded(data));

  } catch(error) {
    console.log(error);
    // TODO notification
  }
}

export function* fetchContentType(action) {
  try {

    const requestUrl = `/content-type-builder/models/${action.contentTypeName}`;

    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(contentTypeFetchSucceeded(data));

  } catch(error) {
    console.log(error);
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadConnectionsWatcher = yield fork(takeLatest, CONNECTIONS_FETCH, fetchConnections);
  yield fork(takeLatest, CONTENT_TYPE_FETCH, fetchContentType);

  yield take(LOCATION_CHANGE);

  yield cancel(loadConnectionsWatcher);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
