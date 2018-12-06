/**
 * appDev.js
 * 
 * This is then entry file for the application in development
 * 
 */

import { findIndex } from 'lodash';
import {
  getAppPluginsSucceeded,
  unsetHasUserPlugin,
} from 'containers/App/actions';
import 'babel-polyfill';
import 'sanitize.css/sanitize.css';
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

dispatch(getAppPluginsSucceeded(plugins));

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

export {
  dispatch,
};
