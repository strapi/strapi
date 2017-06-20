import _ from 'lodash';
import {takeLatest} from 'redux-saga';
import {fork, put} from 'redux-saga/effects';

import {loadedModels} from './actions';
import {LOAD_MODELS, UPDATE_SCHEMA} from './constants';

export function* getModels() {
  try {
    const opts = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
    };
    const response = yield fetch(
      '/content-manager/models',
      opts
    );
    const data = yield response.json();

    yield put(loadedModels(data));
  } catch (err) {
    window.Strapi.notification.error(
      'An error occurred during models config fetch.'
    );
  }
}

export function* schemaUpdated(action) {
  // Display the links only if the `displayed` attribute is not set to false
  const displayedModels = _.pickBy(action.schema, model => (model.displayed !== false));

  // Map links to format them
  const leftMenuLinks = _.map(displayedModels, (model, key) => ({
    label: model.labelPlural || model.label || key,
    to: key,
  }));

  // Update the admin left menu links
  window.Strapi.refresh('content-manager').leftMenuLinks(leftMenuLinks);
}

// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, LOAD_MODELS, getModels);
  yield fork(takeLatest, UPDATE_SCHEMA, schemaUpdated);
}

// All sagas to be loaded
export default [defaultSaga];
