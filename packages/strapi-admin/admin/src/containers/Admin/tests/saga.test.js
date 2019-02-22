/**
 * Test  sagas
 */

/* eslint-disable redux-saga/yield-effects */
import { all, fork, put, takeLatest } from 'redux-saga/effects';
// import { take, call, put, select } from 'redux-saga/effects';
import defaultSaga, { getData } from '../saga';

import { getInitDataSucceeded } from '../actions';
import { GET_INIT_DATA } from '../constants';

describe('getData Saga', () => {
  let getDataGenerator;

  beforeEach(() => {
    getDataGenerator = getData();
    const response = [
      { uuid: 'uuid' },
      { strapiVersion: 'beta' },
      { autoReload: true, currentEnvironment: 'test' },
      { layout: {} },
    ];
    const callDescriptor = getDataGenerator.next(response).value;

    expect(callDescriptor).toMatchSnapshot();
  });

  it('should dispatch the getInitDataSucceeded action it it requests the data successfully', () => {
    const response = [
      { uuid: 'uuid' },
      { strapiVersion: 'beta' },
      { autoReload: true, currentEnvironment: 'test' },
      { layout: {} },
    ];
    const putDescriptor = getDataGenerator.next(response).value;
    const [
      { uuid },
      { strapiVersion },
      { autoReload, currentEnvironment },
      { layout },
    ] = response;

    expect(putDescriptor).toEqual(put(getInitDataSucceeded({ autoReload, uuid, strapiVersion, currentEnvironment, layout })));
  });

  it('should call the strapi.notification action if the response errors', () => {
    const response = new Error('Some error');
    getDataGenerator.throw(response).value;

    expect(strapi.notification.error).toHaveBeenCalled();
  });
});


describe('defaultSaga Saga', () => {
  const defaultSagaSaga = defaultSaga();

  it('should start task to watch for GET_INIT_DATA action', () => {
    const forkDescriptor = defaultSagaSaga.next().value;

    expect(forkDescriptor).toEqual(all([fork(takeLatest, GET_INIT_DATA, getData)]));
  });
});
