import { LOCATION_CHANGE } from 'react-router-redux';
import {
  // call,
  cancel,
  fork,
  put,
  // select,
  take,
  takeLatest,
} from 'redux-saga/effects';

// import request from 'utils/request';
import fakeData from './fakeData.json';

import { getPluginsSucceeded } from './actions';
import { GET_PLUGINS } from './constants';

export function* pluginsGet() {
  try {
    const availablePlugins = fakeData.availablePlugins;
    const supportUs = {
      description: 'app.components.InstallPluginPage.plugin.support-us.description',
      id: 'support-us',
      icon: '',
      name: 'buy a t-shirt',
      price: 30,
      ratings: 5,
      isCompatible: true,
    };

    yield put(getPluginsSucceeded(availablePlugins.concat([supportUs])));
  } catch(err) {
    strapi.notification.error('notification.error');
  }
}



// Individual exports for testing
export default function* defaultSaga() {
  const loadPluginsWatcher = yield fork(takeLatest, GET_PLUGINS, pluginsGet);

  yield take(LOCATION_CHANGE);

  yield cancel(loadPluginsWatcher);
}
