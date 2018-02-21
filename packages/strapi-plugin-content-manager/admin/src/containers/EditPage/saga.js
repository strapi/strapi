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
import templateObject from 'utils/templateObject';

import { getDataSucceeded } from './actions';
import { GET_DATA } from './constants';
import {
  makeSelectModelName,
  // makeSelectSource,
} from './selectors';

function* dataGet(action) {
  try {
    const modelName = yield select(makeSelectModelName());
    const params = { source: action.source };
    const response = yield call(
      request,
      `/content-manager/explorer/${modelName}/${action.id}`,
      { method: 'GET', params },
    );

    const pluginHeaderTitle = yield call(templateObject, { mainField: action.mainField }, response);
    yield put(getDataSucceeded(action.id, response, pluginHeaderTitle.mainField));
  } catch(err) {
    strapi.notification.error('content-manager.error.record.fetch');
  }
}

function* defaultSaga() {
  const loadDataWatcher = yield fork(takeLatest, GET_DATA, dataGet);

  yield take(LOCATION_CHANGE);

  yield cancel(loadDataWatcher);
}

export default defaultSaga;
