import { takeLatest } from 'redux-saga';
import { LOCATION_CHANGE } from 'react-router-redux';
import { call, take, put, fork, cancel } from 'redux-saga/effects';
import request from 'utils/request';
import { MODELS_FETCH } from './constants';
import { modelsFetchSucceeded } from './actions';

export function* fetchModels() {
  try {

    const requestUrl = '/content-type-builder/models';
    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(modelsFetchSucceeded(data));

  } catch(error) {
    console.log(error);
  }
}



// Individual exports for testing
export function* defaultSaga() {
  const loadModelsWatcher = yield fork(takeLatest, MODELS_FETCH, fetchModels);

  // Suspend execution until location changes
  yield take(LOCATION_CHANGE);
  yield cancel(loadModelsWatcher);
}

// All sagas to be loaded
export default [defaultSaga];
