import { get, includes, isArray, omit, set } from 'lodash';
import { call, fork, put, select, takeLatest } from 'redux-saga/effects';
import auth from 'utils/auth';
import request from 'utils/request';

import { hideLoginErrorsInput, submitError, submitSucceeded } from './actions';
import { SUBMIT } from './constants';
import { makeSelectFormType, makeSelectModifiedData } from './selectors';

export function* submitForm(action) {

  try {
    const body = yield select(makeSelectModifiedData());
    const formType = yield select(makeSelectFormType());
    const isRegister = formType === 'register';

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

    const response = yield call(request, requestURL, { method: 'POST', body: omit(body, 'news') });

    if(get(response, 'user.role.name', '') === 'Administrator' || isRegister){
      
      yield call(auth.setToken, response.jwt, body.rememberMe);
      yield call(auth.setUserInfo, response.user, body.rememberMe);
    }

    if (isRegister) {
      action.context.updatePlugin('users-permissions', 'hasAdminUser', true);

      if (body.news) {
        try {
          yield call(request, 'https://analytics.strapi.io/register', {
            method: 'POST',
            body: omit(body, ['password', 'confirmPassword']),
          });
        } catch (e) {
          // Silent.
        }
      }
    }

    yield put(submitSucceeded());
  } catch(error) {
    const formType = yield select(makeSelectFormType());

    if (isArray(get(error, ['response', 'payload', 'message']))) {

      const errors = error.response.payload.message.reduce((acc, key) => {
        const err = key.messages.reduce((acc, key) => {
          acc.id = `users-permissions.${key.id}`;

          return acc;
        }, { id: '' });

        acc.push(err);

        return acc;
      }, []);

      let formErrors;

      switch (formType) {
        case 'forgot-password':
          formErrors = [{ name: 'email', errors }];
          break;
        case 'login':
          formErrors = [{ name: 'identifier', errors }, { name: 'password', errors }];
          yield put(hideLoginErrorsInput(true));
          break;
        case 'reset-password':
          if (errors[0].id === 'users-permissions.Auth.form.error.code.provide') {
            strapi.notification.error(errors[0].id);
          } else {
            formErrors = [{ name: 'password', errors }];
          }
          break;
        case 'register': {
          const target = includes(get(errors, ['0', 'id']), 'username') ? 'username' : 'email';
          formErrors = [{ name: target, errors }];
          break;
        }
        default:

      }

      yield put(submitError(formErrors));
    } else {
      strapi.notification.error('notification.error');
    }
  }
}

export default function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, submitForm);
}
