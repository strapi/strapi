import { takeLatest } from 'redux-saga';
import { put } from 'redux-saga/effects';

import {
  loadedRecord,
} from './actions';

import {
  LOAD_RECORD,
} from './constants';

export function* getRecord() {
  const fakeData = {
    id: 1,
    title: 'Roger Federer has won the first set.',
    message: 'Try to do better than that man and you will be a winner.'
  };

  yield put(loadedRecord(fakeData));
}

// Individual exports for testing
export function* defaultSaga() {
  yield takeLatest(LOAD_RECORD, getRecord);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
