// FIXME: eslint-disable
/* eslint-disable */

import { call, fork, put, select, takeLatest } from 'redux-saga/effects';
import { flatten, convert } from 'react-sortly';
import { GET_MENU, SUBMIT } from './constants';
import { getMenuSucceeded } from './actions';
import { remapSortlyInput, remapSortlyOutput } from '../utils/RemapSortlyData';
import { request } from 'strapi-helper-plugin';
import { SelectMenuItemsData } from './selectors';
import pluginId from '../pluginId';

const sourceMenuEndpoint = `/${pluginId}/source-menu`;

export function* menuGet() {
  try {
    const data = yield call(request, sourceMenuEndpoint, {
      method: 'GET',
    });
    yield put(
      getMenuSucceeded({
        menuItems: convert(remapSortlyInput(data)),
      })
    );
  } catch (error) {
    strapi.notification.error('notification.error');
  }
}

export function* submit() {
  try {
    const body = remapSortlyOutput(
      flatten(yield select(SelectMenuItemsData()))
    );
    yield call(request, sourceMenuEndpoint, {
      method: 'PUT',
      body,
    });
    strapi.notification.success(`${pluginId}.MenuEditor.dataSaved`);
    yield call(menuGet);
  } catch (error) {
    strapi.notification.error('notification.error');
  }
}

function* defaultSaga() {
  yield fork(takeLatest, GET_MENU, menuGet);
  yield fork(takeLatest, SUBMIT, submit);
}
export default defaultSaga;
