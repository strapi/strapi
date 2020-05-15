import { call, fork, put, select, takeLatest } from 'redux-saga/effects';
import { request } from 'strapi-helper-plugin';
import { flatten, convert } from 'react-sortly';
import { getMenuSucceeded } from './actions';
import { GET_MENU, SUBMIT } from './constants';
import { SelectMenuItemsData } from './selectors';
import pluginId from '../../pluginId';
import { remapSortlyInput, remapSortlyOutput } from '../../utils/RemapSortlyData';

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
    const body = remapSortlyOutput(flatten(yield select(SelectMenuItemsData())));
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
