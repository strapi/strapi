import { takeLatest } from 'redux-saga';
import { put, select } from 'redux-saga/effects';

import {
  loadedRecord
} from './actions';

import {
  LOAD_RECORDS
} from './constants';

import {
  makeSelectCurrentModel,
} from './selectors';

export function* getRecords() {
  const currentModel = yield select(makeSelectCurrentModel());

  try {
    const opts = {
      method: 'GET',
      mode: 'cors',
      cache: 'default'
    };
    const response = yield fetch(`http://localhost:1337/content-manager/explorer/${currentModel}`, opts);
    const data = yield response.json();

    yield put(loadedRecord(data));
  } catch (err) {
    console.error(err);
  }
}


// Individual exports for testing
export function* defaultSaga() {
  yield takeLatest(LOAD_RECORDS, getRecords);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
