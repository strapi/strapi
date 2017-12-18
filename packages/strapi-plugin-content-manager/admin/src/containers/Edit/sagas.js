import { LOCATION_CHANGE } from 'react-router-redux';
import { get, isArray } from 'lodash';
import { call, cancel, fork, put, take, select, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';
import cleanData from 'utils/cleanData';
import { router } from 'app';

import { decreaseCount } from 'containers/List/actions';

import {
  recordLoaded,
  recordEdited,
  recordEditError,
  recordDeleted,
  recordDeleteError,
  setFormErrors,
} from './actions';
import { LOAD_RECORD, EDIT_RECORD, DELETE_RECORD } from './constants';
import {
  makeSelectCurrentModelName,
  makeSelectRecord,
  makeSelectIsCreating,
} from './selectors';

export function* getRecord(action) {
  const currentModelName = yield select(makeSelectCurrentModelName());
  const params = {};

  if (action.source !== undefined) {
    params.source = action.source;
  }

  try {
    const requestUrl = `/content-manager/explorer/${currentModelName}/${action.id}`;

    // Call our request helper (see 'utils/request')
    const response = yield request(requestUrl, {
      method: 'GET',
      params,
    });

    yield put(recordLoaded(response));
  } catch (err) {
    strapi.notification.error('content-manager.error.record.fetch');
  }
}

export function* editRecord(action) {
  const currentModelName = yield select(makeSelectCurrentModelName());
  const record = yield select(makeSelectRecord());
  const recordJSON = record.toJSON();

  const recordCleaned = Object.keys(recordJSON).reduce((acc, current) => {
    acc[current] = cleanData(recordJSON[current], 'value', 'id');

    return acc;
  }, {});

  const isCreating = yield select(makeSelectIsCreating());
  const id = isCreating ? '' : recordCleaned.id;
  const params = {};

  if (action.source !== undefined) {
    params.source = action.source;
  }

  try {
    const requestUrl = `/content-manager/explorer/${currentModelName}/${id}`;

    // Call our request helper (see 'utils/request')
    yield call(request, requestUrl, {
      method: isCreating ? 'POST' : 'PUT',
      body: recordCleaned,
      params,
    });

    strapi.notification.success('content-manager.success.record.save');
    yield put(recordEdited());
  } catch (err) {
    if (isArray(err.response.payload.message)) {
      const errors = err.response.payload.message.reduce((acc, current) => {
        const error = current.messages.reduce((acc, current) => {
          acc.errorMessage = current.id;

          return acc;
        }, { id: 'components.Input.error.custom-error', errorMessage: '' });
        acc.push(error);

        return acc;
      }, []);

      const name = get(err.response.payload.message, ['0', 'messages', '0', 'field']);

      yield put(setFormErrors([{ name, errors }]));
    }

    yield put(recordEditError());
    strapi.notification.error(isCreating ? 'content-manager.error.record.create' : 'content-manager.error.record.update');
  }
}

export function* deleteRecord({ id, modelName, source }) {
  function* httpCall(id, modelName) {
    try {
      const requestUrl = `/content-manager/explorer/${modelName}/${id}`;
      const params = {};

      if (source !== undefined) {
        params.source = source;
      }
      // Call our request helper (see 'utils/request')
      yield call(request, requestUrl, {
        method: 'DELETE',
        params,
      });

      yield put(recordDeleted(id));
      yield put(decreaseCount());
      strapi.notification.success('content-manager.success.record.delete');

      // Redirect to the list page.
      router.push({
        pathname: `/plugins/content-manager/${modelName}`,
        search: `?source=${source}`,
      });
    } catch (err) {
      yield put(recordDeleteError());
      strapi.notification.error('content-manager.error.record.delete');
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
