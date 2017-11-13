import { fork, takeLatest, put } from 'redux-saga/effects';

import { submitSucceeded } from './actions';
import { SUBMIT } from './constants';

export function* submitForm() {
  try {
    // TODO dynamic
    yield put(submitSucceeded());

  } catch(error) {
    window.Strapi.notification.error('An error occured');
  }
}

export default function* defaultSaga() {
  yield fork(takeLatest, SUBMIT, submitForm);
}
