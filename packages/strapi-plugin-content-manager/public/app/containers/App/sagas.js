import { takeLatest } from 'redux-saga';
import { fork, put } from 'redux-saga/effects';
import _ from 'lodash';

import {
  loadedModels
} from './actions';

import {
  LOAD_MODELS,
} from './constants';

export function* getModels() {
  try {
    const opts = {
      method: 'GET',
      mode: 'cors',
      cache: 'default'
    };
    const response = yield fetch('http://localhost:1337/admin/api/models', opts);
    const data = yield response.json();

    yield put(loadedModels(data));

    const leftMenuLinks = _.map(data, (model, key) => ({
      label: model.globalId,
      to: key,
    }));

    // Update the admin left menu links
    window.Strapi.refresh('content-manager').leftMenuLinks(leftMenuLinks);
  } catch (err) {
    console.error(err);
  }
}

// Individual exports for testing
export function* defaultSaga() {
  // yield takeLatest(LOAD_MODELS, getModels);
  yield fork(takeLatest, LOAD_MODELS, getModels);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
