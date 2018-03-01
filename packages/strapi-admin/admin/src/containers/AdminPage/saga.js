import { LOCATION_CHANGE } from 'react-router-redux';
import { call, cancel, fork, put, take, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';

import { getUploadEnvSucceeded } from './actions';
import { GET_UPLOAD_ENV } from './constants';

function* envGet() {
  try {
    const response = yield call(request, '/upload/environments', { method: 'GET' });
    yield put(getUploadEnvSucceeded(response));
  } catch(err) {
    console.log(err);
  }
}

function* defaultSaga() {
  const loadEnvWatcher = yield fork(takeLatest, GET_UPLOAD_ENV, envGet);
  yield take(LOCATION_CHANGE);
  yield cancel(loadEnvWatcher);

}

export default defaultSaga;
