import { call, fork, takeLatest, put, select } from 'redux-saga/effects';
import auth from 'utils/auth';
import request from 'utils/request';

import { makeSelectFormType, makeSelectModifiedData } from './selectors';
import { submitSucceeded } from './actions';
import { SUBMIT } from './constants';

export function* submitForm() {
  try {
    const formType = yield select(makeSelectFormType());
    const body = yield select(makeSelectModifiedData());

    if (formType === 'login' || formType === 'register') {
      const endPoint = formType === 'login' ? '' : '/register';
      const response = yield call(request, `/auth/local${endPoint}`, { method: 'POST', body });

      if (response.jwt) {
        yield call(auth.setToken, response.jwt, body.rememberMe);
        yield call(auth.setUserInfo, response.user, body.rememberMe);
      }
    }

    yield put(submitSucceeded());
  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export default function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, submitForm);
}
