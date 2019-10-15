/**
 * Test  sagas
 */

/* eslint-disable redux-saga/yield-effects */
/* eslint-disable redux-saga/no-unhandled-errors */
import { all, fork, takeLatest } from 'redux-saga/effects';
import defaultSaga, { emitter } from '../saga';

import { EMIT_EVENT } from '../constants';

describe('defaultSaga Saga', () => {
  const defaultSagaSaga = defaultSaga();

  it('should start task to watch for GET_INIT_DATA and GET_SECURED_DATA actions', () => {
    const forkDescriptor = defaultSagaSaga.next().value;

    expect(forkDescriptor).toEqual(
      all([fork(takeLatest, EMIT_EVENT, emitter)])
    );
  });
});
