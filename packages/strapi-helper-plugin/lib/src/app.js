/**
 * app.js
 *
 * This is the entry file for the application,
 * only setup and plugin code.
 */

/* eslint-disable import/first */
// Don't move this line!
import './public-path.js'; // eslint-disable-line import/extensions

import React from 'react';
import Loadable from 'react-loadable';
import { Provider } from 'react-redux';
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';
import configureStore from './store';
import { translationMessages } from './i18n';

const LoadableApp = Loadable({
  loader: () => import('containers/App'),
  loading: LoadingIndicatorPage
});

const tryRequireRoot = source => {
  try {
    return require('../../../../admin/src/' + source + '.js').default; // eslint-disable-line prefer-template
  } catch (err) {
    return null;
  }
};

const bootstrap = tryRequireRoot('bootstrap');
const pluginRequirements = tryRequireRoot('requirements');

const layout = (() => {
  try {
    return require('../../../../config/layout.js'); // eslint-disable-line import/no-unresolved
  } catch (err) {
    return null;
  }
})();

const injectedComponents = (() => {
  try {
    return require('injectedComponents').default; // eslint-disable-line import/no-unresolved
  } catch (err) {
    return [];
  }
})();

// Plugin identifier based on the package.json `name` value
const pluginPkg = require('../../../../package.json');
const pluginId = pluginPkg.name.replace(/^strapi-plugin-/i, '');
const pluginName = pluginPkg.strapi.name;
const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const apiUrl = `${strapi.backendURL}/${pluginId}`;
const router = strapi.router;

// Create redux store with Strapi admin history
const store = configureStore({}, strapi.router, pluginName);

// Define the plugin root component
function Comp(props) {
  return (
    <Provider store={store}>
      <LoadableApp {...props} />
    </Provider>
  );
}

if (window.Cypress) {
  window.__store__ = Object.assign(window.__store__ || {}, {
    [pluginId]: store
  });
}

// Hot reloadable translation json files
if (module.hot) {
  // modules.hot.accept does not accept dynamic dependencies,
  // have to be constants at compile-time
  module.hot.accept('./i18n', () => {
    if (strapi) {
      System.import('./i18n').then(result => {
        const translationMessagesUpdated = result.translationMessages;
        strapi
          .refresh(pluginId)
          .translationMessages(translationMessagesUpdated);
      });
    }
  });
}

// Register the plugin.
strapi.registerPlugin({
  blockerComponent: null,
  blockerComponentProps: {},
  bootstrap,
  description: pluginDescription,
  icon: pluginPkg.strapi.icon,
  id: pluginId,
  injectedComponents,
  layout,
  leftMenuLinks: [],
  mainComponent: Comp,
  name: pluginPkg.strapi.name,
  pluginRequirements,
  preventComponentRendering: false,
  translationMessages
});

// Export store
export { store, apiUrl, pluginId, pluginName, pluginDescription, router };
