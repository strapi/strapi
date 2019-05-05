import { all, fork, call, put, select, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';

import { getInitDataSucceeded, getSecuredDataSucceeded } from './actions';
import { EMIT_EVENT, GET_INIT_DATA, GET_SECURED_DATA } from './constants';
import { makeSelectUuid } from './selectors';

export function* emitter(action) {
  try {
    const requestURL = 'https://analytics.strapi.io/track';
    const uuid = yield select(makeSelectUuid());
    const { event, properties } = action;

    if (uuid) {
      yield call(
        fetch, // eslint-disable-line no-undef
        requestURL,
        {
          method: 'POST',
          body: JSON.stringify({ event, uuid, properties }),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  } catch (err) {
    console.log(err); // eslint-disable-line no-console
  }
}

export function* getData() {
  try {
    const endPoints = [
      'gaConfig',
      'strapiVersion',
      'currentEnvironment',
      'layout',
    ];
    const [
      { uuid },
      { strapiVersion },
      { autoReload, currentEnvironment },
      { layout },
    ] = yield all(
      endPoints.map(endPoint =>
        call(request, `/admin/${endPoint}`, { method: 'GET' }),
      ),
    );

    yield put(
      getInitDataSucceeded({
        autoReload,
        uuid,
        strapiVersion,
        currentEnvironment,
        layout,
      }),
    );
  } catch (err) {
    strapi.notification.error('notification.error');
  }
}

/* istanbul ignore next */
export function* getSecuredData() {
  try {
    const data = {};

    yield put(getSecuredDataSucceeded(data));
  } catch (err) {
    console.log(err); // eslint-disable-line no-console
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield all([
    fork(takeLatest, EMIT_EVENT, emitter),
    fork(takeLatest, GET_INIT_DATA, getData),
    fork(takeLatest, GET_SECURED_DATA, getSecuredData),
  ]);
}
