// import { LOCATION_CHANGE } from 'react-router-redux';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';

import {
  getSettingsSucceeded,
} from './actions';
import {
  GET_SETTINGS,
} from './constants';

export function* settingsGet(action) {
  try {
    const requestURL = `/upload/settings/${action.env}`;
    const response = yield call(request, requestURL, { method: 'GET' });
    yield put(getSettingsSucceeded(response));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

function* defaultSaga() {
  yield fork(takeLatest, GET_SETTINGS, settingsGet);
}

export default defaultSaga;
