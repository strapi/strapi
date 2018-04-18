import { fork, call, put, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';

import {
  getGaStatusSucceeded,
  getLayoutSucceeded,
  getStrapiVersionSucceeded,
} from './actions';
import { GET_GA_STATUS, GET_LAYOUT } from './constants';

function* getGaStatus() {
  try {
    const [allowGa, strapiVersion] = yield [
      call(request, '/admin/gaConfig', { method: 'GET' }),
      call(request, '/admin/strapiVersion', { method: 'GET' }),
    ];

    yield put(getGaStatusSucceeded(allowGa));
    yield put(getStrapiVersionSucceeded(strapiVersion.strapiVersion));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

function* getLayout() {
  try {
    const layout = yield call(request, '/admin/layout', { method: 'GET' });
    yield put(getLayoutSucceeded(layout));
  } catch(err) {
    strapi.notification.error('notification.error.layout');
  }
}

function* defaultSaga() {
  yield fork(takeLatest, GET_GA_STATUS, getGaStatus);
  yield fork(takeLatest, GET_LAYOUT, getLayout);
}

export default defaultSaga;
