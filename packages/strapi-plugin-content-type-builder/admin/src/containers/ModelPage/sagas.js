import { LOCATION_CHANGE } from 'react-router-redux';
import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel } from 'redux-saga/effects';
import request from 'utils/request';
import { MODEL_FETCH } from './constants';
import { modelFetchSucceeded } from './actions';

// Individual exports for testing
export function* fetchModel(action) {
  try {
    const requestUrl = `/content-type-builder/models/${action.modelName}`;

    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(modelFetchSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export function* defaultSaga() {
  const loadModelWatcher = yield fork(takeLatest, MODEL_FETCH, fetchModel);

  yield take(LOCATION_CHANGE);

  yield cancel(loadModelWatcher);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
