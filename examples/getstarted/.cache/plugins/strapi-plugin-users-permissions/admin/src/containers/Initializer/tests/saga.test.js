/**
 * Test  sagas
 */

/* eslint-disable redux-saga/yield-effects */

import { fork, put, takeLatest } from 'redux-saga/effects';
import defaultSaga, { initialize } from '../saga';
import { initializeSucceeded } from '../actions';
import { INITIALIZE } from '../constants';

describe('initialize Saga', () => {
  let initializeGenerator;

  beforeEach(() => {
    initializeGenerator = initialize();
    const data = { hasAdmin: true };

    const callDescriptor = initializeGenerator.next(data).value;

    expect(callDescriptor).toMatchSnapshot();
  });

  it('should dispatch the initializeSucceeded action if it requests the data successfully', () => {
    const response = { hasAdmin: true };

    const putDescriptor = initializeGenerator.next(response).value;
    expect(putDescriptor).toEqual(put(initializeSucceeded(response.hasAdmin)));
  });

  it('should call the strapi.notification action if the response errors', () => {
    const response = new Error('Some error');
    initializeGenerator.throw(response).value;

    expect(strapi.notification.error).toHaveBeenCalled();
  });
});

describe('defaultSaga Saga', () => {
  const defaultSagaSaga = defaultSaga();

  it('should start task to watch for INITIALIZE action', () => {
    const forkDescriptor = defaultSagaSaga.next().value;
    expect(forkDescriptor).toEqual(fork(takeLatest, INITIALIZE, initialize));
  });
});
