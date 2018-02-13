import { LOCATION_CHANGE } from 'react-router-redux';
import { findIndex } from 'lodash';
import { takeLatest, put, fork, take, cancel, select, call } from 'redux-saga/effects';

import request from 'utils/request';

import {
  deleteDataSucceeded,
  fetchDataSucceeded,
  setForm,
  submitSucceeded,
} from './actions';

import {
  DELETE_DATA,
  FETCH_DATA,
  SUBMIT,
} from './constants';

// TODO uncomment to test design providers and so on...
// import data from './data.json';

import {
  makeSelectAllData,
  makeSelectDataToDelete,
  makeSelectDeleteEndPoint,
  makeSelectModifiedData,
} from './selectors';

export function* dataDelete() {
  try {
    const allData = yield select(makeSelectAllData());
    const dataToDelete = yield select(makeSelectDataToDelete());
    const indexDataToDelete = findIndex(allData, ['name', dataToDelete.name]);
    const endPointAPI = yield select(makeSelectDeleteEndPoint());

    if (indexDataToDelete !== -1) {
      const id = dataToDelete.id;
      const requestURL = `/users-permissions/${endPointAPI}/${id}`;
      const response = yield call(request, requestURL, { method: 'DELETE' });

      if (response.ok) {
        yield put(deleteDataSucceeded(indexDataToDelete));
        strapi.notification.success('users-permissions.notification.success.delete');
      }
    }
  } catch(err) {
    strapi.notification.error('users-permissions.notification.error.delete');
  }
}

export function* dataFetch(action) {
  try {
    const response = yield call(request, `/users-permissions/${action.endPoint}`, { method: 'GET' });

    if (action.endPoint === 'advanced') {
      yield put(setForm(response));
    } else {
      const data = response[action.endPoint] || response;
      yield put(fetchDataSucceeded(data));
    }
  } catch(err) {
    console.log(err);
    strapi.notification.error('users-permissions.notification.error.fetch');
  }
}

export function* submitData(action) {
  try {
    const body = yield select(makeSelectModifiedData());
    const opts = { method: 'PUT', body };

    yield call(request, `/users-permissions/${action.endPoint}`, opts);
    yield put(submitSucceeded());
    strapi.notification.success('users-permissions.notification.success.submit');
  } catch(error) {
    strapi.notification.error('notification.error');
  }
}
// Individual exports for testing
export function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, FETCH_DATA, dataFetch);

  yield fork(takeLatest, DELETE_DATA, dataDelete);
  yield fork(takeLatest, SUBMIT, submitData);

  yield take(LOCATION_CHANGE);
  yield cancel(loadDataWatcher);
}

// All sagas to be loaded
export default defaultSaga;
