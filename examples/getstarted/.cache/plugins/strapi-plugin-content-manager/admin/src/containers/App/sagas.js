import { fork, put, call, takeLatest, select } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';
import {
  getModelEntriesSucceeded,
  loadedModels,
  submitSucceeded,
} from './actions';
import { GET_MODEL_ENTRIES, LOAD_MODELS, ON_SUBMIT } from './constants';
import { makeSelectModifiedSchema } from './selectors';

export function* modelEntriesGet(action) {
  try {
    const requestUrl = `/content-manager/explorer/${action.modelName}/count${
      action.source !== undefined ? `?source=${action.source}` : ''
    }`;
    const response = yield call(request, requestUrl, { method: 'GET' });

    yield put(getModelEntriesSucceeded(response.count));
  } catch (error) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export function* getModels() {
  try {
    const response = yield call(request, '/content-manager/models', {
      method: 'GET',
    });

    yield put(loadedModels(response));
  } catch (err) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export function* submit(action) {
  try {
    const schema = yield select(makeSelectModifiedSchema());
    yield call(request, '/content-manager/models', {
      method: 'PUT',
      body: { schema },
    });

    action.context.emitEvent('didSaveContentTypeLayout');

    yield put(submitSucceeded());
  } catch (err) {
    // Silent
    // NOTE: should we add another notification??
  }
}

// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, LOAD_MODELS, getModels);
  yield fork(takeLatest, GET_MODEL_ENTRIES, modelEntriesGet);
  yield fork(takeLatest, ON_SUBMIT, submit);

  // yield take(LOCATION_CHANGE);

  // yield cancel(loadModelsWatcher);
  // yield cancel(loadEntriesWatcher);
}

// All sagas to be loaded
export default defaultSaga;
