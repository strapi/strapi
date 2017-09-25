import { takeLatest } from 'redux-saga';
import { LOCATION_CHANGE } from 'react-router-redux';
import { put, select, fork, call, take, cancel } from 'redux-saga/effects';

import request from 'utils/request';

import { loadedRecord, loadedCount } from './actions';
import { LOAD_RECORDS, LOAD_COUNT } from './constants';
import {
  makeSelectCurrentModelName,
  makeSelectLimit,
  makeSelectCurrentPage,
  makeSelectSort,
} from './selectors';

export function* getRecords() {
  const currentModel = yield select(makeSelectCurrentModelName());
  const limit = yield select(makeSelectLimit());
  const currentPage = yield select(makeSelectCurrentPage());
  const sort = yield select(makeSelectSort());

  // Calculate the number of values to be skip
  const skip = (currentPage - 1) * limit;

  // Init `params` object
  const params = {
    skip,
    limit,
    sort,
  };

  try {
    const requestUrl = `${window.Strapi.apiUrl}/content-manager/explorer/${currentModel}`;

    // Call our request helper (see 'utils/request')
    const response = yield call(request, requestUrl, {
      method: 'GET',
      params,
    });

    yield put(loadedRecord(response));
  } catch (err) {
    window.Strapi.notification.error('An error occurred during records fetch.');
  }
}

export function* getCount() {
  const currentModel = yield select(makeSelectCurrentModelName());

  try {
    const response = yield call(
      request,
      `${window.Strapi.apiUrl}/content-manager/explorer/${currentModel}/count`,
    );

    yield put(loadedCount(response.count));
  } catch (err) {
    window.Strapi.notification.error(
      'An error occurred during count records fetch.'
    );
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadRecordsWatcher = yield fork(takeLatest, LOAD_RECORDS, getRecords);
  const loudCountWatcher = yield fork(takeLatest, LOAD_COUNT, getCount);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);
  yield cancel(loadRecordsWatcher);
  yield cancel(loudCountWatcher);
}

// All sagas to be loaded
export default defaultSaga;