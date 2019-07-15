import { all, fork, put, call, takeLatest, select } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { deleteLayouts } from '../Main/actions';
import { getDataSucceeded, submitSucceeded } from './actions';
import { GET_DATA, ON_SUBMIT } from './constants';
import { makeSelectModifiedData } from './selectors';

const getRequestUrl = path => `/${pluginId}/fixtures/${path}`;

export function* getData() {
  try {
    const [{ generalSettings }, { groups }, { models }] = yield all(
      ['general-settings', 'groups', 'models'].map(endPoint =>
        call(request, getRequestUrl(endPoint), { method: 'GET' })
      )
    );

    yield put(getDataSucceeded(generalSettings, groups, models));
  } catch (err) {
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export function* submit() {
  try {
    const body = yield select(makeSelectModifiedData());

    yield call(request, getRequestUrl('general-settings'), {
      method: 'PUT',
      body,
    });

    yield put(deleteLayouts());
    yield put(submitSucceeded());
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

function* defaultSaga() {
  try {
    yield all([
      fork(takeLatest, GET_DATA, getData),
      fork(takeLatest, ON_SUBMIT, submit),
    ]);
  } catch (err) {
    // Do nothing
  }
}

export default defaultSaga;
