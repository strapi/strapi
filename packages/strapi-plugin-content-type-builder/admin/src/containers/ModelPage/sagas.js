import { LOCATION_CHANGE } from 'react-router-redux';
import { forEach, get, includes, map, replace, set, size, unset } from 'lodash';
import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel, select } from 'redux-saga/effects';

import request from 'utils/request';

import { temporaryContentTypePosted } from 'containers/App/actions';

import { storeData } from '../../utils/storeData';

import { MODEL_FETCH, SUBMIT } from './constants';
import { modelFetchSucceeded, postContentTypeSucceeded, resetShowButtonsProps, setButtonLoader, unsetButtonLoader } from './actions';
import { makeSelectModel } from './selectors';

export function* fetchModel(action) {
  try {
    const requestUrl = `/content-type-builder/models/${action.modelName}`;

    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(modelFetchSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export function* submitChanges() {
  try {
    // Show button loader
    yield put(setButtonLoader());

    const modelName = get(storeData.getContentType(), 'name');

    const body = yield select(makeSelectModel());
    map(body.attributes, (attribute, index) => {
      // Remove the connection key from attributes
      if (attribute.connection) {
        unset(body.attributes[index], 'connection');
      }

      forEach(attribute.params, (value, key) => {
        if (includes(key, 'Value')) {
          // Remove and set needed keys for params
          set(body.attributes[index].params, replace(key, 'Value', ''), value);
          unset(body.attributes[index].params, key);
        }

        if (!value) {
          unset(body.attributes[index].params, key);
        }
      });
    })

    const method = modelName === body.name ? 'POST' : 'PUT';
    const baseUrl = '/content-type-builder/models/';
    const requestUrl = method === 'POST' ? baseUrl : `${baseUrl}${body.name}`;
    const opts = { method, body };

    yield call(request, requestUrl, opts);

    if (method === 'POST') {
      storeData.clearAppStorage();
      yield put(temporaryContentTypePosted(size(get(body, 'attributes'))));
      yield put(postContentTypeSucceeded());
    }

    yield new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });

    yield put(resetShowButtonsProps());
    // Remove loader
    yield put(unsetButtonLoader());

  } catch(error) {
    console.log(error);
  }
}

export function* defaultSaga() {
  const loadModelWatcher = yield fork(takeLatest, MODEL_FETCH, fetchModel);
  // const deleteAttributeWatcher = yield fork(takeLatest, DELETE_ATTRIBUTE, attributeDelete);
  const loadSubmitChanges = yield fork(takeLatest, SUBMIT, submitChanges);

  yield take(LOCATION_CHANGE);

  yield cancel(loadModelWatcher);
  // yield cancel(deleteAttributeWatcher);
  yield cancel(loadSubmitChanges);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
