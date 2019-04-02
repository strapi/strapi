/**
 * appDev.js
 *
 * This is then entry file for the application in development
 *
 */

import { findIndex } from 'lodash';
import request from 'utils/request';
import 'babel-polyfill';
import 'sanitize.css/sanitize.css';
import {
  getAppPluginsSucceeded,
  unsetHasUserPlugin,
  getAppDataSucceeded,
} from './containers/App/actions';
import { store } from './createStore';
import render from './renderApp';
import './intlPolyfill';
import './strapi';

const dispatch = store.dispatch;
const plugins = (() => {
  try {
    return require('./config/plugins.json');
  } catch (e) {
    return [];
  }
})();

const getAppData = async () => {
  const arrayOfPromises = [
    'gaConfig',
    'strapiVersion',
    'currentEnvironment',
    'layout',
  ].map(endPoint => request(`/admin/${endPoint}`, { method: 'GET' }));

  return Promise.all(arrayOfPromises);
};

const getData = async () => {
  try {
    const data = await getAppData();

    dispatch(getAppDataSucceeded(data));
    dispatch(getAppPluginsSucceeded(plugins));
  } catch (err) {
    console.log({ err });
  }
};

getData();

// Hot reloadable translation json files
if (module.hot) {
  // modules.hot.accept does not accept dynamic dependencies,
  // have to be constants at compile-time
  module.hot.accept('./i18n', () => {
    render(translationMessages);
  });
}

if (findIndex(plugins, ['id', 'users-permissions']) === -1) {
  dispatch(unsetHasUserPlugin());
}

export { dispatch };
