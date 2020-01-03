import { findIndex, get } from 'lodash';
import { takeLatest, put, fork, select, call } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import {
  deleteDataSucceeded,
  fetchDataSucceeded,
  setForm,
  submitSucceeded,
} from './actions';
import { DELETE_DATA, FETCH_DATA, SUBMIT } from './constants';
import {
  makeSelectAllData,
  makeSelectDataToDelete,
  makeSelectDeleteEndPoint,
  makeSelectModifiedData,
} from './selectors';

export function* dataDelete() {
  try {
    const allData = yield select(makeSelectAllData());
    const dataToDelete = yield select(makeSelectDataToDelete());
    const endPointAPI = yield select(makeSelectDeleteEndPoint());
    const indexDataToDelete = findIndex(allData[endPointAPI], [
      'name',
      dataToDelete.name,
    ]);

    if (indexDataToDelete !== -1) {
      const id = dataToDelete.id;
      const requestURL = `/${pluginId}/${endPointAPI}/${id}`;
      const response = yield call(request, requestURL, { method: 'DELETE' });

      if (response.ok) {
        yield put(deleteDataSucceeded(indexDataToDelete));
        strapi.notification.success(getTrad('notification.success.delete'));
      }
    }
  } catch (err) {
    strapi.notification.error(getTrad('notification.error.delete'));
  }
}

export function* dataFetch(action) {
  try {
    const response = yield call(request, `/${pluginId}/${action.endPoint}`, {
      method: 'GET',
    });

    if (action.endPoint === 'advanced') {
      yield put(setForm(response));
    } else {
      const data = response[action.endPoint] || response;
      yield put(fetchDataSucceeded(data));
    }
  } catch (err) {
    strapi.notification.error(getTrad('notification.error.fetch'));
  }
}

export function* submitData(action) {
  try {
    const body = yield select(makeSelectModifiedData());
    const opts = {
      method: 'PUT',
      body:
        action.endPoint === 'advanced'
          ? get(body, ['advanced', 'settings'], {})
          : body,
    };

    yield call(request, `/${pluginId}/${action.endPoint}`, opts);

    if (action.endPoint === 'email-templates') {
      action.context.emitEvent('didEditEmailTemplates');
    } else if (action.endPoint === 'providers') {
      action.context.emitEvent('didEditAuthenticationProvider');
    }

    yield put(submitSucceeded());
    strapi.notification.success(getTrad('notification.success.submit'));
  } catch (error) {
    strapi.notification.error('notification.error');
  }
}
// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, FETCH_DATA, dataFetch);
  yield fork(takeLatest, DELETE_DATA, dataDelete);
  yield fork(takeLatest, SUBMIT, submitData);
}

// All sagas to be loaded
export default defaultSaga;
