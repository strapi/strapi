import { LOCATION_CHANGE } from 'react-router-redux';
import { fork, put, call, takeLatest, take, cancel } from 'redux-saga/effects';
import request from 'utils/request';


import { getModelEntriesSucceeded, loadedModels } from './actions';
import { GET_MODEL_ENTRIES, LOAD_MODELS } from './constants';

export function* modelEntriesGet(action) {
  try {
    const requestUrl = `/content-manager/explorer/${action.modelName}/count${action.source !== undefined ? `?source=${action.source}`: ''}`;
    const response = yield call(request, requestUrl, { method: 'GET' });

    yield put(getModelEntriesSucceeded(response.count));
  } catch(error) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export function* getModels() {
  try {
    const response = yield call(request, `/content-manager/models`, {
      method: 'GET',
    });

    yield put(loadedModels(response));
  } catch (err) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

// Individual exports for testing
export function* defaultSaga() {
  const loadModelsWatcher = yield fork(takeLatest, LOAD_MODELS, getModels);
  const loadEntriesWatcher = yield fork(takeLatest, GET_MODEL_ENTRIES, modelEntriesGet);

  yield take(LOCATION_CHANGE);

  yield cancel(loadModelsWatcher);
  yield cancel(loadedModelsWatcher);
  yield cancel(loadEntriesWatcher);
}

// All sagas to be loaded
export default defaultSaga;
