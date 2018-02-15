// import { LOCATION_CHANGE } from 'react-router-redux';
import { fork, select, takeLatest } from 'redux-saga/effects';

import { ON_SEARCH } from './constants';
import { makeSelectSearch } from './selectors';

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
  yield fork(takeLatest, ON_SEARCH, search);
}

// All sagas to be loaded
export default defaultSaga;
