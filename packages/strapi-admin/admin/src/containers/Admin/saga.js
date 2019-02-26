import { all, fork, call, put, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';

import { getInitDataSucceeded, getSecuredDataSucceeded } from './actions';
import { GET_INIT_DATA, GET_SECURED_DATA } from './constants';

export function* getData() {
  try {
    const endPoints = ['gaConfig', 'strapiVersion', 'currentEnvironment', 'layout'];
    const [
      { uuid },
      { strapiVersion },
      { autoReload, currentEnvironment },
      { layout },
    ] = yield all(endPoints.map(endPoint => call(request, `/admin/${endPoint}`, { method: 'GET' })));

    yield put(getInitDataSucceeded({ autoReload, uuid, strapiVersion, currentEnvironment, layout }));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

/* istanbul ignore next */
export function* getSecuredData() {
  try {
    const data = {};

    yield put(getSecuredDataSucceeded(data));
  } catch(err) {
    console.log(err); // eslint-lint-disable-line no-console
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield all([
    fork(takeLatest, GET_INIT_DATA, getData),
    fork(takeLatest, GET_SECURED_DATA, getSecuredData),
  ]);
}
