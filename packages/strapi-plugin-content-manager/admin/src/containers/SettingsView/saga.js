import { all, fork, put, call, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import { getDataSucceeded } from './actions';
import { GET_DATA } from './constants';

const getRequestUrl = path => `/${pluginId}/${path}`;

export function* getData() {
  try {
    const [{ generalSettings }, { groups }, { models }] = yield all(
      ['fixtures/general-settings', 'fixtures/groups', 'fixtures/models'].map(
        endPoint => call(request, getRequestUrl(endPoint), { method: 'GET' })
      )
    );

    yield put(getDataSucceeded(generalSettings, groups, models));
  } catch (err) {
    console.log(err);
  }
}

function* defaultSaga() {
  try {
    yield all([fork(takeLatest, GET_DATA, getData)]);
  } catch (err) {
    // Do nothing
  }
}

export default defaultSaga;
