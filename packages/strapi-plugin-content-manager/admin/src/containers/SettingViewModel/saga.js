import { all, fork, put, call, takeLatest, select } from 'redux-saga/effects';
import { get, set } from 'lodash';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { deleteLayout } from '../Main/actions';
import { unformatLayout } from '../../utils/layout';
import { getDataSucceeded, submitSucceeded } from './actions';
import { GET_DATA, ON_SUBMIT } from './constants';
import { makeSelectModifiedData } from './selectors';

const getRequestUrl = path => `/${pluginId}/${path}`;

export function* getData({ source, uid }) {
  try {
    const params = source ? { source } : {};
    const { data: layout } = yield call(
      request,
      getRequestUrl(`content-types/${uid}`),
      {
        method: 'GET',
        params,
      }
    );

    const firstEditLayoutField = get(
      layout,
      ['layouts', 'edit', 0, 0, 'name'],
      ''
    );
    const firstEditLayoutFieldType = get(
      layout,
      ['schema', 'attributes', firstEditLayoutField, 'type'],
      null
    );
    const firstEditLayoutRelation = get(
      layout,
      ['layouts', 'editRelations', 0],
      null
    );

    const formItemToSelectName =
      firstEditLayoutField || firstEditLayoutRelation;
    const formItemToSelectType = firstEditLayoutFieldType || 'relation';

    console.log({ layout });

    yield put(
      getDataSucceeded(layout, formItemToSelectName, formItemToSelectType)
    );
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

export function* submit({ emitEvent, source, uid }) {
  try {
    const body = yield select(makeSelectModifiedData());
    // We need to send the unformated edit layout
    set(body, 'layouts.edit', unformatLayout(body.layouts.edit));

    delete body.schema;
    delete body.uid;
    delete body.source;

    const params = source ? { source } : {};

    yield call(request, getRequestUrl(`content-types/${uid}`), {
      method: 'PUT',
      body,
      params,
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
