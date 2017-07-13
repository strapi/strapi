import { take, call, put, fork, select } from 'redux-saga/effects';
import { takeLatest } from 'redux-saga';
import { CONFIG_FETCH } from './constants';

export function* fetchConfig(action) {
  try {
    console.log('sagas', action);

  } catch(err) {
    console.log(err);
  }
}



// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, CONFIG_FETCH, fetchConfig);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
