import { set } from 'lodash';
import { call, fork, takeLatest, put, select } from 'redux-saga/effects';
import auth from 'utils/auth';
import request from 'utils/request';

import { makeSelectFormType, makeSelectModifiedData } from './selectors';
import { submitError, submitSucceeded } from './actions';
import { SUBMIT } from './constants';

export function* submitForm() {
  try {
    const formType = yield select(makeSelectFormType());
    const body = yield select(makeSelectModifiedData());
    let requestURL;

    switch (formType) {
      case 'login':
        requestURL = '/auth/local';
        break;
      case 'register':
        requestURL = '/auth/local/register';
        break;
      case 'reset-password':
        requestURL = '/auth/reset-password';
        break;
      case 'forgot-password':
        requestURL = '/auth/forgot-password';
        set(body, 'url', `${strapi.backendURL}/admin/plugins/users-permissions/auth/reset-password`);
        break;
      default:

    }

    const response = yield call(request, requestURL, { method: 'POST', body });

    if (response.jwt) {
      yield call(auth.setToken, response.jwt, body.rememberMe);
      yield call(auth.setUserInfo, response.user, body.rememberMe);
    }

    if (formType === 'forgot-password') {
      strapi.notification.info('The email has been sent');
    }

    yield put(submitSucceeded());
  } catch(error) {
    const formType = yield select(makeSelectFormType());
    const errors = [{ id: error.response.payload.message }];

    let formErrors;

    switch (formType) {
      case 'forgot-password':
        formErrors = [{ name: 'email', errors }];
        break;
      // TODO : handle other error type;
      default:

    }

    strapi.notification.error(error.response.payload.message);

    yield put(submitError(formErrors));
  }
}

export default function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, submitForm);
}
