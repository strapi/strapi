import { takeLatest } from 'redux-saga';
import { put, select, fork, call } from 'redux-saga/effects';
import request from 'utils/request';

import {
  loadedRecord,
  loadedCount,
} from './actions';

import {
  LOAD_RECORDS,
  LOAD_COUNT,
} from './constants';

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
    console.error(err);
  }
}

export function* getCount() {
  const currentModel = yield select(makeSelectCurrentModelName());

  try {
    const opts = {
      method: 'GET',
      mode: 'cors',
      cache: 'default'
    };
    const response = yield fetch(`http://localhost:1337/content-manager/explorer/${currentModel}/count`, opts);

    const data = yield response.json();

    yield put(loadedCount(data.count));
  } catch (err) {
    console.error(err);
  }
}

// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, LOAD_RECORDS, getRecords);
  yield fork(takeLatest, LOAD_COUNT, getCount);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
