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
  deleteDataSuccess,
  getDataSucceeded,
} from './actions';
// Constants
import {
  DELETE_DATA,
  GET_DATA,
} from './constants';
// Selectors
import {
  makeSelectParams,
} from './selectors';

export function* dataGet(action) {
  try {
    const { limit, page, sort } = yield select(makeSelectParams());
    const source = action.source;
    const currentModel = action.currentModel;
    const countURL = `/content-manager/explorer/${currentModel}/count`;

    // Params to get the model's records
    const recordsURL = `/content-manager/explorer/${currentModel}`;
    const skip = (page - 1 ) * limit;
    const params = {
      limit,
      skip,
      sort,
      source,
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

export function* dataDelete({ id, modelName, source}) {
  try {
    const requestUrl = `/content-manager/explorer/${modelName}/${id}`;
    const params = {};

    if (source !== undefined) {
      params.source = source;
    }

    yield call(request, requestUrl, {
      method: 'DELETE',
      params,
    });

    strapi.notification.success('content-manager.success.record.delete');

    yield put(deleteDataSuccess(id));
  } catch(err) {
    strapi.notification.error('content-manager.error.record.delete');
  }
}

// All sagas to be loaded
function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, GET_DATA, dataGet);
  yield fork(takeLatest, DELETE_DATA, dataDelete);

  yield take(LOCATION_CHANGE);

  yield cancel(loadDataWatcher);
}

export default defaultSaga;
