import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { get } from 'lodash';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import { getDataSucceeded, getLayoutSucceeded } from './actions';
import { GET_DATA, GET_LAYOUT } from './constants';

const getRequestUrl = path => `/${pluginId}/${path}`;

const createPossibleMainFieldsForModelsAndComponents = array => {
  return array.reduce((acc, current) => {
    const attributes = get(current, ['schema', 'attributes'], {});
    const possibleMainFields = Object.keys(attributes).filter(attr => {
      return ![
        'boolean',
        'component',
        'json',
        'media',
        'password',
        'relation',
        'text',
        'richtext',
      ].includes(get(attributes, [attr, 'type'], ''));
    });

    acc[current.uid] = possibleMainFields;

    return acc;
  }, {});
};

function* getData() {
  try {
    const [{ data: components }, { data: models }] = yield all(
      ['components', 'content-types'].map(endPoint =>
        call(request, getRequestUrl(endPoint), { method: 'GET' })
      )
    );

    yield put(
      getDataSucceeded(components, models, {
        ...createPossibleMainFieldsForModelsAndComponents(components),
        ...createPossibleMainFieldsForModelsAndComponents(models),
      })
    );
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

function* getLayout({ uid }) {
  try {
    const { data: layout } = yield call(
      request,
      getRequestUrl(`content-types/${uid}`),
      {
        method: 'GET',
      }
    );

    yield put(getLayoutSucceeded(layout, uid));
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

function* defaultSaga() {
  try {
    yield all([
      fork(takeLatest, GET_DATA, getData),
      fork(takeLatest, GET_LAYOUT, getLayout),
    ]);
  } catch (err) {
    // Do nothing
  }
}

export default defaultSaga;
