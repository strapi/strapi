import { LOCATION_CHANGE } from 'react-router-redux';
import { takeLatest } from 'redux-saga';
import { call, take, put, fork, cancel, select } from 'redux-saga/effects';
import request from 'utils/request';
import { DELETE_ATTRIBUTE, MODEL_FETCH } from './constants';
import { modelFetchSucceeded } from './actions';
import { makeSelectModel } from './selectors';

// Individual exports for testing
export function* attributeDelete(action) {
  try {
    if (action.sendRequest) {
      const body = yield select(makeSelectModel());
      const requestUrl = `/content-type-builder/models/${action.modelName}`;
      const opts = {
        method: 'PUT',
        body,
      };

      yield call(request, requestUrl, opts);
    }
  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export function* fetchModel(action) {
  try {
    const requestUrl = `/content-type-builder/models/${action.modelName}`;

    const data = yield call(request, requestUrl, { method: 'GET' });

    yield put(modelFetchSucceeded(data));

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export function* defaultSaga() {
  const loadModelWatcher = yield fork(takeLatest, MODEL_FETCH, fetchModel);
  const deleteAttributeWatcher = yield fork(takeLatest, DELETE_ATTRIBUTE, attributeDelete);

  yield take(LOCATION_CHANGE);

  yield cancel(loadModelWatcher);
  yield cancel(deleteAttributeWatcher);
}

// All sagas to be loaded
export default [
  defaultSaga,
];
