import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';
import { clone, set, unset } from 'lodash';
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
    const clonedParams = clone(params);
    const _start = (clonedParams._page - 1) * parseInt(clonedParams._limit, 10);

    set(clonedParams, '_start', _start);
    unset(clonedParams, '_page');

    if (clonedParams._q === '') {
      unset(clonedParams, '_q');
    }

    const search = Object.keys(clonedParams)
      .reduce((acc, current) => {
        if (current !== 'filters') {
          acc.push(`${current}=${clonedParams[current]}`);
        } else {
          const filters = clonedParams[current].reduce((acc, curr) => {
            const key =
              curr.filter === '=' ? curr.name : `${curr.name}${curr.filter}`;
            acc.push(`${key}=${curr.value}`);

            return acc;
          }, []);

          if (filters.length > 0) {
            acc.push(filters.join('&'));
          }
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

export function* deleteData({ id, slug, emitEvent }) {
  try {
    emitEvent('willDeleteEntry');
    yield call(request, getRequestUrl(`${slug}/${id}`), {
      method: 'DELETE',
    });

    strapi.notification.success(`${pluginId}.success.record.delete`);
    yield put(onDeleteDataSucceeded());
    emitEvent('didDeleteEntry');
  } catch (err) {
    strapi.notification.error(`${pluginId}.error.record.delete`);
  }
}

export function* deleteAll({ ids, slug }) {
  try {
    const params = Object.assign(ids);

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
