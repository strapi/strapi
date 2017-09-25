import { LOCATION_CHANGE } from 'react-router-redux';
import { call, cancel, fork, put, take, select, takeLatest } from 'redux-saga/effects';

import request from 'utils/request';
import cleanData from 'utils/cleanData';
import { router } from 'app';

import {
  recordLoaded,
  recordEdited,
  recordEditError,
  recordDeleted,
  recordDeleteError,
} from './actions';
import { LOAD_RECORD, EDIT_RECORD, DELETE_RECORD } from './constants';
import {
  makeSelectCurrentModelName,
  makeSelectRecord,
  makeSelectIsCreating,
} from './selectors';

export function* getRecord(params) {
  const currentModelName = yield select(makeSelectCurrentModelName());

  try {
    const requestUrl = `${window.Strapi.apiUrl}/content-manager/explorer/${currentModelName}/${params.id}`;

    // Call our request helper (see 'utils/request')
    const response = yield request(requestUrl, {
      method: 'GET',
    });

    yield put(recordLoaded(response));
  } catch (err) {
    window.Strapi.notification.error('content-manager.error.record.fetch');
  }
}

export function* editRecord() {
  const currentModelName = yield select(makeSelectCurrentModelName());
  const record = yield select(makeSelectRecord());
  const recordJSON = record.toJSON();

  const recordCleaned = Object.keys(recordJSON).reduce((acc, current) => {
    acc[current] = cleanData(recordJSON[current], 'value', 'id');

    return acc;
  }, {});

  const isCreating = yield select(makeSelectIsCreating());
  const id = isCreating ? '' : recordCleaned.id;

  try {
    const requestUrl = `${window.Strapi.apiUrl}/content-manager/explorer/${currentModelName}/${id}`;

    // Call our request helper (see 'utils/request')
    yield call(request, requestUrl, {
      method: isCreating ? 'POST' : 'PUT',
      body: recordCleaned,
    });

    yield put(recordEdited());
    window.Strapi.notification.success('content-manager.success.record.save');
  } catch (err) {
    yield put(recordEditError());
    window.Strapi.notification.error(isCreating ? 'content-manager.error.record.create' : 'content-manager.error.record.update');
  }
}

export function* deleteRecord({ id, modelName }) {
  function* httpCall(id, modelName) {
    try {
      const requestUrl = `${window.Strapi.apiUrl}/content-manager/explorer/${modelName}/${id}`;

      // Call our request helper (see 'utils/request')
      yield call(request, requestUrl, {
        method: 'DELETE',
      });

      yield put(recordDeleted(id));
      window.Strapi.notification.success('content-manager.success.record.delete');

      // Redirect to the list page.
      router.push(`/plugins/content-manager/${modelName}`);
    } catch (err) {
      yield put(recordDeleteError());
      window.Strapi.notification.error('content-manager.error.record.delete');
    }
  }

  if (id && modelName) {
    yield httpCall(id, modelName);
  } else {
    const currentModelName = yield select(makeSelectCurrentModelName());
    const record = yield select(makeSelectRecord());
    const recordJSON = record.toJSON();

    yield httpCall(recordJSON.id, currentModelName);
  }
}

export function* defaultSaga() {
  const loadRecordWatcher = yield fork(takeLatest, LOAD_RECORD, getRecord);
  const editRecordWatcher = yield fork(takeLatest, EDIT_RECORD, editRecord);
  const deleteRecordWatcher = yield fork(takeLatest, DELETE_RECORD, deleteRecord);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);

  yield cancel(loadRecordWatcher);
  yield cancel(editRecordWatcher);
  yield cancel(deleteRecordWatcher);
}

// All sagas to be loaded
export default defaultSaga;
