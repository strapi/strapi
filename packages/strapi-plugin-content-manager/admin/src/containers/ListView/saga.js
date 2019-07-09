import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';
import { set, unset } from 'lodash';
import pluginId from '../../pluginId';

import { getDataSucceeded, onDeleteSeveralDataSucceeded } from './actions';
import { GET_DATA, ON_DELETE_SEVERAL_DATA } from './constants';
// import {} from './selectors';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

// eslint-disable-next-line require-yield
export function* getData({ uid, params }) {
  try {
    const _start = (params._page - 1) * parseInt(params._limit, 10);

    set(params, '_start', _start);
    unset(params, '_page');

    if (params._q === '') {
      unset(params, '_q');
    }

    const [{ count }, data] = yield all([
      call(request, getRequestUrl(`${uid}/count`), {
        method: 'GET',
        params,
      }),
      call(request, getRequestUrl(`${uid}`), {
        method: 'GET',
        params,
      }),
    ]);

    yield put(getDataSucceeded(count, data));
  } catch (err) {
    console.log({ err });
    strapi.notification.error('content-manager.error.model.fetch');
  }
}

export function* deleteAll({ ids, slug, source }) {
  try {
    const params = Object.assign(ids, { source });
    console.log({ params });

    yield call(request, getRequestUrl(`deleteAll/${slug}`), {
      method: 'DELETE',
      params,
    });

    yield put(onDeleteSeveralDataSucceeded());
    // yield call(dataGet, { currentModel: model, source });
    strapi.notification.success('content-manager.success.record.delete');
  } catch (err) {
    strapi.notification.error('content-manager.error.record.delete');
  }
}

function* defaultSaga() {
  try {
    yield all([
      fork(takeLatest, GET_DATA, getData),
      fork(takeLatest, ON_DELETE_SEVERAL_DATA, deleteAll),
    ]);
  } catch (err) {
    // Do nothing
  }
}

export default defaultSaga;
