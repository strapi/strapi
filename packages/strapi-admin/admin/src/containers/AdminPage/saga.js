import { fork, call, put, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';

import { getGaStatusSucceeded } from './actions';
import { GET_GA_STATUS } from './constants';

function* getGaStatus() {
  try {
    const response = yield call(request, '/admin/gaConfig', { method: 'GET' });
    yield put(getGaStatusSucceeded(response.allowGa));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

function* defaultSaga() {
  yield fork(takeLatest, GET_GA_STATUS, getGaStatus);
}

export default defaultSaga;
