import { takeLatest } from 'redux-saga';
import { put, select, fork, call } from 'redux-saga/effects';
import request from 'utils/request';
import { browserHistory } from 'react-router';

import {
  recordLoaded,
  recordEdited,
  recordEditError,
  recordDeleted,
  recordDeleteError,
} from './actions';

import {
  LOAD_RECORD,
  EDIT_RECORD,
  DELETE_RECORD,
} from './constants';

import {
  makeSelectCurrentModelName,
  makeSelectRecord,
  makeSelectIsCreating,
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

  const isCreating =  yield select(makeSelectIsCreating());
  const id = isCreating ? '' : recordJSON.id;

  try {
    const requestURL = `http://localhost:1337/content-manager/explorer/${currentModelName}/${id}`;

    // Call our request helper (see 'utils/request')
    yield call(request, requestURL, {
      method: isCreating ? 'POST' : 'PUT',
      body: recordJSON,
    });

    yield put(recordEdited());
    window.Strapi.notification.success(`The entry has been successfully ${isCreating ? 'created' : 'updated'}.`);
  } catch (err) {
    yield put(recordEditError());
    window.Strapi.notification.error(`An error occurred during record ${isCreating ? 'creation' : 'update'}.`);
  }
}

export function* deleteRecord() {
  const currentModelName = yield select(makeSelectCurrentModelName());
  const record = yield select(makeSelectRecord());
  const recordJSON = record.toJSON();

  try {
    const requestURL = `http://localhost:1337/content-manager/explorer/${currentModelName}/${recordJSON.id}`;

    // Call our request helper (see 'utils/request')
    yield call(request, requestURL, {
      method: 'DELETE',
    });

    yield put(recordDeleted());
    window.Strapi.notification.success('The entry has been successfully deleted.');
    // TODO: Redirect to the list page.
  } catch (err) {
    yield put(recordDeleteError());
    window.Strapi.notification.error('An error occurred during record deletion.');
  }
}

export function* defaultSaga() {
  yield fork(takeLatest, LOAD_RECORD, getRecord);
  yield fork(takeLatest, EDIT_RECORD, editRecord);
  yield fork(takeLatest, DELETE_RECORD, deleteRecord);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
