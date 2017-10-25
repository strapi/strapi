import { LOCATION_CHANGE } from 'react-router-redux';
import { takeLatest, put, fork, take, cancel } from 'redux-saga/effects';

import { loadedData } from './actions';
import { LOAD_DATA } from './constants';

export function* loadData() {
  // Fake API request delay
  yield new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });

  // Generate a random array
  const data = Array(4).fill(0).map(() => Math.floor(Math.random() * 100));

  yield put(loadedData(data));
}

// Individual exports for testing
export function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, LOAD_DATA, loadData);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);
  yield cancel(loadDataWatcher);
}

// All sagas to be loaded
export default defaultSaga;
