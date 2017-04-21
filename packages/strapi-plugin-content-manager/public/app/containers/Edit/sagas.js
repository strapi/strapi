import { takeLatest } from 'redux-saga';
import { put, select, fork, call } from 'redux-saga/effects';
import request from 'utils/request';

import {
  recordLoaded,
  recordEdited,
  recordEditError,
} from './actions';

import {
  LOAD_RECORD,
  EDIT_RECORD,
} from './constants';

import {
  makeSelectCurrentModelName,
  makeSelectRecord,
} from './selectors';

export function* getRecord(params) {
  const currentModelName = yield select(makeSelectCurrentModelName());

  try {
    const requestURL = `http://localhost:1337/content-manager/explorer/${currentModelName}/${params.id}`;

    // Call our request helper (see 'utils/request')
    const data = yield call(request, requestURL, {
      method: 'GET',
    });

    yield put(recordLoaded(data));
  } catch (err) {
    console.error(err);
  }
}

export function* editRecord() {
  const currentModelName = yield select(makeSelectCurrentModelName());
  const record = yield select(makeSelectRecord());
  const recordJSON = record.toJSON();

  try {
    const requestURL = `http://localhost:1337/content-manager/explorer/${currentModelName}/${recordJSON.id}`;

    // Call our request helper (see 'utils/request')
    yield call(request, requestURL, {
      method: 'PUT',
      body: recordJSON,
    });

    yield put(recordEdited());
    window.Strapi.notification.success('The entry has been successfully updated.');
  } catch (err) {
    yield put(recordEditError());
    window.Strapi.notification.error('An error occurred during record update.');
  }
}

export function* defaultSaga() {
  yield fork(takeLatest, LOAD_RECORD, getRecord);
  yield fork(takeLatest, EDIT_RECORD, editRecord);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
