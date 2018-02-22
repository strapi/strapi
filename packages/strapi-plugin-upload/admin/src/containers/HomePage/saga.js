import { LOCATION_CHANGE } from 'react-router-redux';
import { Map } from 'immutable';
import { fork, put, select, take, takeLatest } from 'redux-saga/effects';
// import request from 'utils/request';

import {
  deleteSuccess,
  dropSuccess,
  getDataSuccess,
} from './actions';
import {
  DELETE_DATA,
  GET_DATA,
  ON_DROP,
  ON_SEARCH,
} from './constants';
import { makeSelectSearch } from './selectors';

function* dataDelete() {
  try {
    // const requestURL = `/upload/something/${action.dataToDelete.id}`;
    yield put(deleteSuccess());
  } catch(err) {
    console.log(err);
  }
}

function* dataGet() {
  try {
    const entriesNumber = 20;
    const data = [
      Map({
        type: 'pdf',
        hash: '1234',
        name: 'avatar.pdf',
        updatedAt: '20/11/2017',
        size: '24 B',
        relatedTo: 'John Doe',
        url: 'https://www.google.com',
        private: false,
      }),
    ];

    yield put(getDataSuccess(data, entriesNumber));
    // TODO: prepare for API call
    // const data = yield [
    //   call(request, 'PATH', { method: 'GET' }),
    //   call(request, 'PATH', { method: 'GET' }),
    // ];
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

function* uploadFiles() {
  try {
    // const files = action.files;
    const newFiles = [
      Map({
        type: 'mov',
        hash: `${Math.random()}`,
        name: 'avatar1.pdf',
        updatedAt: '20/11/2017',
        size: '24 B',
        relatedTo: 'John Doe',
        url: 'https://www.youtube.com',
        private: true,
      }),
    ];

    yield put(dropSuccess(newFiles));

    if (newFiles.length > 1) {
      strapi.notification.success({ id: 'upload.notification.dropFile.success' });
    } else {
      strapi.notification.success({ id: 'upload.notification.dropFiles.success', values: { number: newFiles.length } });
    }

  } catch(err) {
    console.log(err);
    strapi.notification.error('notification.error');
  }
}

function* search() {
  try {
    const search = yield select(makeSelectSearch());
    console.log('will search', search);
  } catch(err) {
    console.log(err);
    strapi.notification.error('notification.error');
  }
}


// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, DELETE_DATA, dataDelete);
  yield fork(takeLatest, ON_DROP, uploadFiles);
  yield fork(takeLatest, ON_SEARCH, search);

  const loadDataWatcher = yield fork(takeLatest, GET_DATA, dataGet);

  yield take(LOCATION_CHANGE);

  yield cancel(loadDataWatcher);
}

// All sagas to be loaded
export default defaultSaga;
