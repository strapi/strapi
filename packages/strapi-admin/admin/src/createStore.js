/**
 * Common configuration for the app in both dev an prod mode
 */

import { createBrowserHistory } from 'history';

import './public-path';
import configureStore from './configureStore';

const basename = strapi.remoteURL.replace(window.location.origin, '');
const history = createBrowserHistory({
  basename,
});
const store = configureStore({}, history);

if (window.Cypress) {
  window.__store__ = Object.assign(window.__store__ || {}, { store });
}

export { basename, history, store };
