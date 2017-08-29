// import { LOCATION_CHANGE } from 'react-router-redux';

import { takeLatest } from 'redux-saga';
import { call, put, fork, select } from 'redux-saga/effects';

import request from 'utils/request';

import {
  connectionsFetchSucceeded,
  contentTypeActionSucceeded,
  contentTypeFetchSucceeded,
} from './actions';

import {
  CONNECTIONS_FETCH,
  CONTENT_TYPE_EDIT,
  CONTENT_TYPE_FETCH,
} from './constants';

import {
  makeSelectInitialDataEdit,
  makeSelectModifiedDataEdit,
} from './selectors';

export function* editContentType() {
  try {
    const body = yield select(makeSelectModifiedDataEdit());
    const opts = {
      method: 'PUT',
      body,
    };

    const initialContentType = yield select(makeSelectInitialDataEdit());
    const requestUrl = `/content-type-builder/models/${initialContentType.name}`;

    yield call(request, requestUrl, opts);

    yield new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });
    yield put(contentTypeActionSucceeded());

  } catch(error) {
    console.log(error);
  }
}

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
  yield fork(takeLatest, CONNECTIONS_FETCH, fetchConnections);

  yield fork(takeLatest, CONTENT_TYPE_EDIT, editContentType);
  yield fork(takeLatest, CONTENT_TYPE_FETCH, fetchContentType);


  // yield take(LOCATION_CHANGE);

  // yield cancel(loadConnectionsWatcher);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
