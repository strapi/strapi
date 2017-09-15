import { takeLatest } from 'redux-saga';
import { call, put, fork } from 'redux-saga/effects';
import request from 'utils/request';
import { DELETE_CONTENT_TYPE, MODELS_FETCH } from './constants';
import { modelsFetchSucceeded } from './actions';

export function* deleteContentType(action) {
  try {
    if (action.sendRequest) {
      const requestUrl = `content-type-builder/models/${action.itemToDelete}`;

      yield call(request, requestUrl, { method: 'DELETE' });
    }

  } catch(error) {
    window.Strapi.notification.error('notification.error.message')
  }
}

export function* fetchModels() {
  try {

    const requestUrl = '/content-type-builder/models';
    const data = yield call(request, requestUrl, { method: 'GET' });
    yield put(modelsFetchSucceeded(data));

  } catch(error) {
    // TODO handle i18n
    window.Strapi.notification.error('notification.error.message')
  }
}



// Individual exports for testing
function* defaultSaga() {
  yield fork(takeLatest, DELETE_CONTENT_TYPE, deleteContentType);
  yield fork(takeLatest, MODELS_FETCH, fetchModels);

}

export default defaultSaga;
