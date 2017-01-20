// import { take, call, put, select } from 'redux-saga/effects';

// Individual exports for testing
export function* defaultSaga() {
  return yield new Promise(resolve => resolve());
}

// All sagas to be loaded
export default [
  defaultSaga,
];
