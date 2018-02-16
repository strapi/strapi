// import { LOCATION_CHANGE } from 'react-router-redux';
import { fork, put, select, takeLatest } from 'redux-saga/effects';


import {
  dropSuccess,
} from './actions';
import {
  ON_DROP,
  ON_SEARCH,
} from './constants';
import { makeSelectSearch } from './selectors';

function* uploadFiles(action) {
  try {
    const files = action.files;

    const newFiles = Object.keys(files).reduce((acc, current) => {
      acc.push(files[current]);

      return acc;
    }, []);

    yield put(dropSuccess(newFiles));

    if (newFiles.length > 1) {
      strapi.notification.success({ id: 'upload.notification.dropFile.success' });
    } else {
      strapi.notification.success({ id: 'upload.notification.dropFiles.success', values: { number: newFiles.length } });
    }

  } catch(err) {
    console.log(err);
  }
}

function* search() {
  try {
    const search = yield select(makeSelectSearch());
    console.log('will search', search);
  } catch(err) {
    console.log(err);
  }
}


// Individual exports for testing
export function* defaultSaga() {
  yield fork(takeLatest, ON_DROP, uploadFiles);
  yield fork(takeLatest, ON_SEARCH, search);
}

// All sagas to be loaded
export default defaultSaga;
