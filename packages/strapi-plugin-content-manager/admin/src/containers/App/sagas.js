import { LOCATION_CHANGE } from 'react-router-redux';
import { map, omit } from 'lodash';
import { fork, put, select, call, takeLatest, take, cancel } from 'redux-saga/effects';

import request from 'utils/request';
import { generateSchema } from 'utils/schema';

import { getModelEntriesSucceeded, loadedModels, updateSchema } from './actions';
import { GET_MODEL_ENTRIES, LOAD_MODELS, LOADED_MODELS } from './constants';
import { makeSelectModels } from './selectors';

export function* modelEntriesGet(action) {
  try {
    const requestUrl = `/content-manager/explorer/${action.modelName}/count${action.source !== undefined ? `?source=${action.source}`: ''}`;

    const response = yield call(request, requestUrl, { method: 'GET' });

    yield put(getModelEntriesSucceeded(response.count));
  } catch(error) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export const generateMenu = function () {
  return request(`/content-manager/models`, {
    method: 'GET',
  })
    .then(response => generateSchema(response))
    .then(displayedModels => {
      return [{
        name: 'Content Types',
        links: map(omit(displayedModels, 'plugins'), (model, key) => ({
          label: model.labelPlural || model.label || key,
          destination: key,
        })),
      }];
    })
    .catch((error) => {
      strapi.notification.error('content-manager.error.model.fetch');
      throw Error(error);
    });
};

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

export function* modelsLoaded() {
  const models = yield select(makeSelectModels());
  let schema;

  try {
    schema = generateSchema(models);
  } catch (err) {
    strapi.notification.error('content-manager.error.schema.generation');
    throw new Error(err);
  }

  yield put(updateSchema(schema));
}

// Individual exports for testing
export function* defaultSaga() {
  const loadModelsWatcher = yield fork(takeLatest, LOAD_MODELS, getModels);
  const loadedModelsWatcher = yield fork(takeLatest, LOADED_MODELS, modelsLoaded);
  const loadEntriesWatcher = yield fork(takeLatest, GET_MODEL_ENTRIES, modelEntriesGet);

  yield take(LOCATION_CHANGE);

  yield cancel(loadModelsWatcher);
  yield cancel(loadedModelsWatcher);
  yield cancel(loadEntriesWatcher);
}

// All sagas to be loaded
export default defaultSaga;
