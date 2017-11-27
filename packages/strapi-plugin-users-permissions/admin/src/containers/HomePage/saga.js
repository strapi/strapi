import { LOCATION_CHANGE } from 'react-router-redux';
import { findIndex } from 'lodash';
import { takeLatest, put, fork, take, cancel, select, call } from 'redux-saga/effects';
import request from 'utils/request';

import {
  deleteDataSucceeded,
  fetchDataSucceeded,
  setForm,
} from './actions';
import {
  DELETE_DATA,
  FETCH_DATA,
} from './constants';

// TODO uncomment to test design providers and so on...
// import data from './data.json';

import {
  makeSelectAllData,
  makeSelectDataToDelete,
  makeSelectDeleteEndPoint,
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
      // TODO watchServerRestart
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

    yield put(fetchDataSucceeded(response[action.endPoint]));
    // To test other views
    // const response = data[action.endPoint];
    // yield put(fetchDataSucceeded(response));

    yield put(setForm(action.endPoint));
  } catch(err) {
    strapi.notification.error('users-permissions.notification.error.fetch');
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, FETCH_DATA, dataFetch);

  yield fork(takeLatest, DELETE_DATA, dataDelete);
  yield take(LOCATION_CHANGE);
  yield cancel(loadDataWatcher);
}

// All sagas to be loaded
export default defaultSaga;
