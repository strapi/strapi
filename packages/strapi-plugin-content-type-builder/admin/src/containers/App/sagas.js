import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel } from 'redux-saga/effects';
import request from 'utils/request';
import { MODELS_FETCH, MODELS_FETCH_SUCCEEDED } from './constants';
import { modelsFetchSucceeded } from './actions';

export function* fetchModels() {
  try {

    const requestUrl = '/content-type-builder/models';
    const data = yield call(request, requestUrl, { method: 'GET' });
    console.log('data', data);
    yield put(modelsFetchSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('notification.error.message')
  }
}



// Individual exports for testing
export function* defaultSaga() {
  const loadModelsWatcher = yield fork(takeLatest, MODELS_FETCH, fetchModels);

  // Suspend execution until location changes
  yield take(MODELS_FETCH_SUCCEEDED);
  yield cancel(loadModelsWatcher);
}

// All sagas to be loaded
export default [defaultSaga];
