// Dependencies.
import { LOCATION_CHANGE } from 'react-router-redux';
import {
  call,
  cancel,
  fork,
  put,
  select,
  take,
  takeLatest,
} from 'redux-saga/effects';

// Utils.
import request from 'utils/request';

// Actions
import {
  getDataSucceeded,
} from './actions';
// Constants
import {
  GET_DATA,
} from './constants';
// Selectors
import {
  makeSelectCurrentModel,
  makeSelectSource,
} from './selectors';

export function* dataGet() {
  try {
    const source = yield select(makeSelectSource());
    const params = { source };
    const currentModel = yield select(makeSelectCurrentModel());
    const countURL = `/content-manager/explorer/${currentModel}/count`;

    const response = yield [
      call(request, countURL, { method: 'GET', params }),
    ];
    yield put(getDataSucceeded(response));

  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

// All sagas to be loaded
function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, GET_DATA, dataGet);

  yield take(LOCATION_CHANGE);

  yield cancel(loadDataWatcher);
}

export default defaultSaga;
