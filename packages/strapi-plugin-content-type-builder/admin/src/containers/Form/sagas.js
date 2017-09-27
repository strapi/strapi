import { takeLatest, call, put, fork, select } from 'redux-saga/effects';
import request from 'utils/request';

import {
  connectionsFetchSucceeded,
  contentTypeActionSucceeded,
  contentTypeFetchSucceeded,
  setButtonLoading,
  unsetButtonLoading,
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
    const initialContentType = yield select(makeSelectInitialDataEdit());
    const requestUrl = `/content-type-builder/models/${initialContentType.name}`;
    const body = yield select(makeSelectModifiedDataEdit());
    const opts = {
      method: 'PUT',
      body,
    };

    yield put(setButtonLoading());

    yield call(request, requestUrl, opts);

    yield new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });

    yield put(contentTypeActionSucceeded());
    yield put(unsetButtonLoading());

    window.Strapi.notification.success('content-type-builder.notification.success.message.contentType.edit');
  } catch(error) {
    window.Strapi.notification.error(error);
  }
}

export function* fetchConnections() {
  try {
    const requestUrl = '/content-type-builder/connections';
    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(connectionsFetchSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('content-type-builder.notification.error.message')
  }
}

export function* fetchContentType(action) {
  try {

    const requestUrl = `/content-type-builder/models/${action.contentTypeName}`;

    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(contentTypeFetchSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('content-type-builder.notification.error.message')
  }
}

// Individual exports for testing
function* defaultSaga() {
  yield fork(takeLatest, CONNECTIONS_FETCH, fetchConnections);
  yield fork(takeLatest, CONTENT_TYPE_EDIT, editContentType);
  yield fork(takeLatest, CONTENT_TYPE_FETCH, fetchContentType);
}

export default defaultSaga;
