import { all, fork, call, put, takeLatest } from 'redux-saga/effects';
import request from 'utils/request';
import { getInitDataSucceeded } from './actions';
import { GET_INIT_DATA } from './constants';

export function* getData() {
  try {
    const endPoints = ['gaConfig', 'strapiVersion', 'currentEnvironment', 'layout'];
    const [
      { uuid },
      { strapiVersion },
      { currentEnvironment },
      { layout },
    ] = yield all(endPoints.map(endPoint => call(request, `/admin/${endPoint}`, { method: 'GET' })));

    yield put(getInitDataSucceeded({ uuid, strapiVersion, currentEnvironment, layout }));
  } catch(err) {
    console.log(err); // eslint-disable-line no-console
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  yield all([
    fork(takeLatest, GET_INIT_DATA, getData),
  ]);
}
