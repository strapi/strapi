import { LOCATION_CHANGE } from 'react-router-redux';
import { findIndex } from 'lodash';
import { takeLatest, put, fork, take, cancel, select } from 'redux-saga/effects';

import {
  deleteDataSucceeded,
  fetchDataSucceeded,
  setForm,
} from './actions';
import {
  DELETE_DATA,
  FETCH_DATA,
} from './constants';
import data from './data.json';
import {
  makeSelectAllData,
  makeSelectDataToDelete,
  // makeSelectDeleteEndPoint,
} from './selectors';

export function* dataDelete() {
  try {
    const allData = yield select(makeSelectAllData());
    const dataToDelete = yield select(makeSelectDataToDelete());
    const indexDataToDelete = findIndex(allData, ['name', dataToDelete.name]);

    if (indexDataToDelete !== -1) {
      yield put(deleteDataSucceeded(indexDataToDelete));

      window.Strapi.notification.success('users-permissions.notification.success.delete');
    }
  } catch(err) {
    window.Strapi.notification.error('users-permissions.notification.error.delete');
  }
}

export function* dataFetch(action) {
  try {
    const response = data[action.endPoint];

    yield put(fetchDataSucceeded(response));
    yield put(setForm(action.endPoint));

  } catch(err) {
    window.Strapi.notification.error('users-permissions.notification.error.fetch');
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
