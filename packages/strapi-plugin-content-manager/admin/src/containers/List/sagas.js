// Dependencies.
import { LOCATION_CHANGE } from 'react-router-redux';
import { put, select, fork, call, take, cancel, takeLatest } from 'redux-saga/effects';

// Utils.
import request from 'utils/request';

// Constants.
import { DELETE_RECORD } from '../Edit/constants';

// Sagas.
import { deleteRecord } from '../Edit/sagas';

// Actions.
import { loadedRecord, loadedCount } from './actions';

// Constants.
import { LOAD_RECORDS, LOAD_COUNT } from './constants';

// Selectors.
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
    window.Strapi.notification.error('content-manager.error.records.fetch');
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
    window.Strapi.notification.error('content-manager.error.records.count');
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadRecordsWatcher = yield fork(takeLatest, LOAD_RECORDS, getRecords);
  const loudCountWatcher = yield fork(takeLatest, LOAD_COUNT, getCount);
  const deleteRecordWatcher = yield fork(takeLatest, DELETE_RECORD, deleteRecord);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);

  yield cancel(loadRecordsWatcher);
  yield cancel(loudCountWatcher);
  yield cancel(deleteRecordWatcher);
}

// All sagas to be loaded
export default defaultSaga;
