import { LOCATION_CHANGE } from 'react-router-redux';
import { takeLatest, put, fork, take, cancel } from 'redux-saga/effects';

import { fetchDataSucceeded } from './actions';
import { FETCH_DATA } from './constants';
import data from './data.json';

export function* dataFetch(action) {
  try {
    const response = data[action.endPoint];

    yield put(fetchDataSucceeded(response));

  } catch(err) {
    window.Strapi.notification.error('An error occured');
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, FETCH_DATA, dataFetch);

  yield take(LOCATION_CHANGE);
  yield cancel(loadDataWatcher);
}

// All sagas to be loaded
export default defaultSaga;
