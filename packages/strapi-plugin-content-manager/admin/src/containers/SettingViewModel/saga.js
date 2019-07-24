import { all, fork, put, call, takeLatest, select } from 'redux-saga/effects';
import { set } from 'lodash';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { deleteLayout } from '../Main/actions';
import { unformatLayout } from '../../utils/layout';
import { getDataSucceeded, submitSucceeded } from './actions';
import { GET_DATA, ON_SUBMIT } from './constants';
import { makeSelectModifiedData } from './selectors';

const getRequestUrl = path => `/${pluginId}/${path}`;

export function* getData({ uid }) {
  try {
    const { data: layout } = yield call(
      request,
      getRequestUrl(`content-types/${uid}`),
      {
        method: 'GET',
      }
    );

    yield put(getDataSucceeded(layout));
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

export function* submit({ emitEvent, uid }) {
  try {
    const body = yield select(makeSelectModifiedData());
    // We need to send the unformated edit layout
    set(body, 'layouts.edit', unformatLayout(body.layouts.edit));

    delete body.schema;

    yield call(request, getRequestUrl(`content-types/${uid}`), {
      method: 'PUT',
      body,
    });
    emitEvent('didSaveContentTypeLayout');
    yield put(deleteLayout(uid));
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
