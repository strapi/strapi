import { map } from 'lodash';
import { fork, put, select, call, takeLatest } from 'redux-saga/effects';

import request from 'utils/request';
import { generateSchema } from 'utils/schema';

import { loadedModels, updateSchema } from './actions';
import { LOAD_MODELS, LOADED_MODELS } from './constants';
import { makeSelectModels } from './selectors';

export const generateMenu = function () {
  return request(`${window.Strapi.apiUrl}/content-manager/models`, {
    method: 'GET',
  })
    .then(response => generateSchema(response))
    .then(displayedModels => {
      return [{
        name: 'Content Types',
        links: map(displayedModels, (model, key) => ({
          label: model.labelPlural || model.label || key,
          destination: key,
        })),
      }];
    })
    .catch((error) => {
      window.Strapi.notification.error('content-manager.error.model.fetch');
      throw Error(error);
    });
}

export function* getModels() {
  try {
    const response = yield call(request,
      `${window.Strapi.apiUrl}/content-manager/models`, {
        method: 'GET',
      });

    yield put(loadedModels(response));
  } catch (err) {
    window.Strapi.notification.error('content-manager.error.model.fetch');
  }
}

export function* modelsLoaded() {
  const models = yield select(makeSelectModels());
  let schema;

  try {
    schema = generateSchema(models);
  } catch (err) {
    window.Strapi.notification.error('content-manager.error.schema.generation');
    throw new Error(err);
  }

  yield put(updateSchema(schema));
}

// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, LOAD_MODELS, getModels);
  yield fork(takeLatest, LOADED_MODELS, modelsLoaded);
}

// All sagas to be loaded
export default defaultSaga;
