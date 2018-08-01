// import { LOCATION_CHANGE } from 'react-router-redux';
import { call, fork, put, select, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';

import {
  getSettingsSucceeded,
  submitSucceeded,
} from './actions';
import {
  GET_SETTINGS,
  SUBMIT,
} from './constants';
import {
  makeSelectEnv,
  makeSelectModifiedData,
} from './selectors';

export function* settingsGet(action) {
  try {
    const requestURL = `/email/settings/${action.env}`;
    const response = yield [
      call(request, requestURL, { method: 'GET' }),
      call(request, '/email/environments', { method: 'GET' }),
    ];

    yield put(getSettingsSucceeded(response[0], response[1].environments));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

export function* submit() {
  try {
    const env = yield select(makeSelectEnv());
    let body = yield select(makeSelectModifiedData());

    if (body.provider === 'local') {
      body = {
        enabled: body.enabled,
        provider: 'local',
        sizeLimit: body.sizeLimit,
      };
    }
    const requestURL = `/email/settings/${env}`;
    yield call(request, requestURL, { method: 'PUT', body });

    // Update reducer with optimisticResponse
    strapi.notification.success('email.notification.config.success');
    yield put(submitSucceeded(body));
  } catch(err) {
    strapi.notification.error('notification.error');
    // TODO handle error PUT
  }
}

function* defaultSaga() {
  yield fork(takeLatest, GET_SETTINGS, settingsGet);
  yield fork(takeLatest, SUBMIT, submit);
}

export default defaultSaga;
