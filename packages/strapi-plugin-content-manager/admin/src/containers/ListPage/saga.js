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
  makeSelectParams,
} from './selectors';

export function* dataGet(action) {
  try {
    const { limit, page, sort, source } = yield select(makeSelectParams());
    const currentModel = action.currentModel;
    const countURL = `/content-manager/explorer/${currentModel}/count`;

    // Params to get the model's records
    const recordsURL = `/content-manager/explorer/${currentModel}`;
    const skip = (page - 1 ) * limit;
    const params = {
      limit,
      skip,
      sort,
    };

    const response = yield [
      call(request, countURL, { method: 'GET', params: { source } }),
      call(request, recordsURL, { method: 'GET', params }),
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
