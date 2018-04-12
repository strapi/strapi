import {
  call,
  fork,
  put,
  select,
  takeLatest,
} from 'redux-saga/effects';

import request from 'utils/request';

import { submitSucceeded } from './actions';
import { SUBMIT } from './constants';
import { makeSelectBody } from './selectors';

function* submit() {
  try {
    const body = yield select(makeSelectBody());
    yield call(request, 'https://analytics.strapi.io/register', { method: 'POST', body });
  } catch(err) {
    // silent
  } finally {
    strapi.notification.success('HomePage.notification.newsLetter.success');
    yield put(submitSucceeded());
  }
}

function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, submit);
}

export default defaultSaga;
