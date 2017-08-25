import { takeLatest } from 'redux-saga';
import { call, put, fork } from 'redux-saga/effects';
import request from 'utils/request';
import { MODELS_FETCH } from './constants';
import { modelsFetchSucceeded } from './actions';

export function* fetchModels() {
  try {

    const requestUrl = '/content-type-builder/models';
    const data = yield call(request, requestUrl, { method: 'GET' });
    yield put(modelsFetchSucceeded(data));

  } catch(error) {
    // TODO handle i18n
    window.Strapi.notification.error('notification.error.message')
  }
}



// Individual exports for testing
export function* defaultSaga() {
  // TODO check if problems
  yield fork(takeLatest, MODELS_FETCH, fetchModels);
  // const loadModelsWatcher = yield fork(takeLatest, MODELS_FETCH, fetchModels);

  // Suspend execution until location changes
  // yield take(MODELS_FETCH_SUCCEEDED);
  // yield cancel(loadModelsWatcher);
}

// All sagas to be loaded
export default [defaultSaga];
