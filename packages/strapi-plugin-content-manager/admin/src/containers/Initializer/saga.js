import { map, omit } from 'lodash';
import { fork, takeLatest, call, put } from 'redux-saga/effects';

import request from 'utils/request';

import { INITIALIZE } from './constants';
import { initializeSucceeded } from './actions';

export function* initialize() {
  try {
    const requestURL = '/content-manager/models';
    const { models: { models } } = yield call(request, requestURL, { method: 'GET' });
    const menu = [
      {
        name: 'Content Types',
        links: map(omit(models, 'plugins'), (model, key) => ({
          label: model.labelPlural || model.label || key,
          destination: key,
        })),
      },
    ];

    yield put(initializeSucceeded(menu));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}

// Individual exports for testing
export default function* defaultSaga() {
  // See example in containers/HomePage/saga.js
  yield fork(takeLatest, INITIALIZE, initialize);
}
