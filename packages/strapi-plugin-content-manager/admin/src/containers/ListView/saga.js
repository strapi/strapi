import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';
import { set, unset } from 'lodash';
import pluginId from '../../pluginId';

import {
  getDataSucceeded,
  onDeleteSeveralDataSucceeded,
  onDeleteDataSucceeded,
} from './actions';
import { GET_DATA, ON_DELETE_DATA, ON_DELETE_SEVERAL_DATA } from './constants';

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

    const search = Object.keys(params)
      .reduce((acc, current) => {
        if (current !== 'filters') {
          acc.push(`${current}=${params[current]}`);
        } else {
          const filters = params[current].reduce((acc, curr) => {
            const key =
              curr.filter === '=' ? curr.name : `${curr.name}${curr.filter}`;
            acc.push(`${key}=${curr.value}`);

            return acc;
          }, []);

          acc.push(filters.join('&'));
        }

        return acc;
      }, [])
      .join('&');

    const [{ count }, data] = yield all([
      call(request, getRequestUrl(`${uid}/count?${search}`), {
        method: 'GET',
      }),
      call(request, getRequestUrl(`${uid}?${search}`), {
        method: 'GET',
      }),
    ]);

    yield put(getDataSucceeded(count, data));
  } catch (err) {
    strapi.notification.error(`${pluginId}.error.model.fetch`);
  }
}

export function* deleteData({ id, uid, source, emitEvent }) {
  try {
    const params = { source };

    emitEvent('willDeleteEntry');
    yield call(request, getRequestUrl(`${uid}/${id}`), {
      method: 'DELETE',
      params,
    });

    strapi.notification.success(`${pluginId}.success.record.delete`);
    yield put(onDeleteDataSucceeded());
    emitEvent('didDeleteEntry');
  } catch (err) {
    strapi.notification.error(`${pluginId}.error.record.delete`);
  }
}

export function* deleteAll({ ids, slug, source }) {
  try {
    const params = Object.assign(ids, { source });

    yield call(request, getRequestUrl(`deleteAll/${slug}`), {
      method: 'DELETE',
      params,
    });

    yield put(onDeleteSeveralDataSucceeded());

    strapi.notification.success(`${pluginId}.success.record.delete`);
  } catch (err) {
    strapi.notification.error(`${pluginId}.error.record.delete`);
  }
}

function* defaultSaga() {
  try {
    yield all([
      fork(takeLatest, GET_DATA, getData),
      fork(takeLatest, ON_DELETE_DATA, deleteData),
      fork(takeLatest, ON_DELETE_SEVERAL_DATA, deleteAll),
    ]);
  } catch (err) {
    // Do nothing
  }
}

export default defaultSaga;
