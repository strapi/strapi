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

export function* getRecords(action) {
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

  if (action.source !== undefined) {
    params.source = action.source;
  }

  try {
    const requestUrl = `/content-manager/explorer/${currentModel}`;
    // Call our request helper (see 'utils/request')
    const response = yield call(request, requestUrl, {
      method: 'GET',
      params,
    });

    yield put(loadedRecord(response));
  } catch (err) {
    strapi.notification.error('content-manager.error.records.fetch');
  }
}

export function* getCount(action) {
  const currentModel = yield select(makeSelectCurrentModelName());
  const params = {};

  if (action.source !== undefined) {
    params.source = action.source;
  }

  try {
    const response = yield call(request,`/content-manager/explorer/${currentModel}/count`, {
      method: 'GET',
      params,
    });

    yield put(loadedCount(response.count));
  } catch (err) {
    strapi.notification.error('content-manager.error.records.count');
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
