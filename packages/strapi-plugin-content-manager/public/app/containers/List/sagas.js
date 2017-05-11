import { takeLatest } from 'redux-saga';
import { put, select, fork, call, take, cancel } from 'redux-saga/effects';
import { LOCATION_CHANGE } from 'react-router-redux';

import request from '../../utils/request';

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
    const requestURL = `http://localhost:1337/content-manager/explorer/${currentModel}`;

    // Call our request helper (see 'utils/request')
    const data = yield call(request, requestURL, {
      method: 'GET',
      params,
    });

    yield put(loadedRecord(data));
  } catch (err) {
    window.Strapi.notification.error('An error occurred during records fetch.');
  }
}

export function* getCount() {
  const currentModel = yield select(makeSelectCurrentModelName());

  try {
    const opts = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
    };
    const response = yield fetch(
      `http://localhost:1337/content-manager/explorer/${currentModel}/count`,
      opts
    );

    const data = yield response.json();

    yield put(loadedCount(data.count));
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
export default [defaultSaga];
