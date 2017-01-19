/**
 * Set of asynchronous functions.
 */

import { takeLatest } from 'redux-saga';
import { put, fork } from 'redux-saga/effects';

import {
  load_success
} from 'containers/HomePage/actions';

import {
  LOAD
} from 'containers/HomePage/constants';


export function *fetchDefault() {
  yield put(load_success({
    name: 'Content Manager'
  }));
}

export function* mySaga() {
  yield fork(takeLatest, LOAD, fetchDefault);
}

// Bootstrap sagas
export default [
  mySaga
];
