import { LOCATION_CHANGE } from 'react-router-redux';
import { get } from 'lodash';
import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel, select } from 'redux-saga/effects';

import request from 'utils/request';

import { temporaryContentTypePosted } from 'containers/App/actions';

import { storeData } from '../../utils/storeData';

import { MODEL_FETCH, SUBMIT } from './constants';
import { modelFetchSucceeded, postContentTypeSucceeded } from './actions';
import { makeSelectModel } from './selectors';

// Individual exports for testing
// export function* attributeDelete(action) {
//   try {
//     if (action.sendRequest) {
//       const body = yield select(makeSelectModel());
//       const requestUrl = `/content-type-builder/models/${action.modelName}`;
//       const opts = {
//         method: 'PUT',
//         body,
//       };
//
//       yield call(request, requestUrl, opts);
//     }
//   } catch(error) {
//     window.Strapi.notification.error('An error occured');
//   }
// }

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
    const modelName = get(storeData.getContentType(), 'name');

    const body = yield select(makeSelectModel());

    const method = modelName === body.name ? 'POST' : 'PUT';
    const baseUrl = '/content-type-builder/models/';
    const requestUrl = method === 'POST' ? baseUrl : `${baseUrl}${body.name}`;
    const opts = { method, body };

    yield call(request, requestUrl, opts);

    if (method === 'POST') {
      storeData.clearAppStorage();
      yield put(temporaryContentTypePosted());
      yield put(postContentTypeSucceeded());
    }

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
