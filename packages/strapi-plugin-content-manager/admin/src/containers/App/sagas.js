import _ from 'lodash';
import { takeLatest } from 'redux-saga';
import { fork, put, select, call } from 'redux-saga/effects';

import request from 'utils/request';
import { generateSchema } from 'utils/schema';

import { loadedModels, updateSchema } from './actions';
import { LOAD_MODELS, LOADED_MODELS, UPDATE_SCHEMA } from './constants';
import { makeSelectModels } from './selectors';


export function* getModels() {
  try {
    const response = yield call(request,
      `${window.Strapi.apiUrl}/content-manager/models`, {
        method: 'GET',
      });

    yield put(loadedModels(response));
  } catch (err) {
    window.Strapi.notification.error(
      'An error occurred during models config fetch.'
    );
  }
}

export function* modelsLoaded() {
  const models = yield select(makeSelectModels());
  let schema;

  try {
    schema = generateSchema(models);
  } catch (err) {
    window.Strapi.notification.error(
      'An error occurred during schema generation.'
    );
    throw new Error(err);
  }

  yield put(updateSchema(schema));
}

export function* schemaUpdated(action) {
  // Display the links only if the `displayed` attribute is not set to false
  const displayedModels = _.pickBy(action.schema, model => (model.displayed !== false));

  // Map links to format them
  const leftMenuSections = [{
    name: 'Content Types',
    links: _.map(displayedModels, (model, key) => ({
      label: model.labelPlural || model.label || key,
      destination: key,
    })),
  }];

  // Update the admin left menu links
  window.Strapi.refresh('content-manager').leftMenuSections(leftMenuSections);
}

// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, LOAD_MODELS, getModels);
  yield fork(takeLatest, UPDATE_SCHEMA, schemaUpdated);
  yield fork(takeLatest, LOADED_MODELS, modelsLoaded);
}

// All sagas to be loaded
export default defaultSaga;