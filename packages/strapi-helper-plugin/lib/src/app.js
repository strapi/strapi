/**
 * app.js
 *
 * This is the entry file for the application,
 * only setup and plugin code.
 */

import React from 'react';
import { Provider } from 'react-redux';

import App from 'containers/App'; // eslint-disable-line

import configureStore from './store';
import { translationMessages } from './i18n';

const tryRequire = (bootstrap = false) => {
  try {
    const config = bootstrap ? require('bootstrap').default : require('requirements').default;
    return config;
  } catch(err) {
    return null;
  }
};

const bootstrap = tryRequire(true);
const pluginRequirements = tryRequire();


// Plugin identifier based on the package.json `name` value
const pluginPkg = require('../../../../package.json');
const pluginId = pluginPkg.name.replace(
  /^strapi-plugin-/i,
  ''
);
const pluginName = pluginPkg.strapi.name;
const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
const apiUrl = window.Strapi && `${window.Strapi.apiUrl}/${pluginId}`;
const router = window.Strapi.router;

// Create redux store with Strapi admin history
const store = configureStore({}, window.Strapi.router);

// Define the plugin root component
function Comp(props) {
  return (
    <Provider store={store}>
      <App {...props} />
    </Provider>
  );
}

// Hot reloadable translation json files
if (module.hot) {
  // modules.hot.accept does not accept dynamic dependencies,
  // have to be constants at compile-time
  module.hot.accept('./i18n', () => {
    if (window.Strapi) {
      System.import('./i18n').then(result => {
        const translationMessagesUpdated = result.translationMessages;
        window.Strapi
          .refresh(pluginId)
          .translationMessages(translationMessagesUpdated);
      });
    }
  });
}

// Register the plugin.
window.Strapi.registerPlugin({
  name: pluginPkg.strapi.name,
  icon: pluginPkg.strapi.icon,
  id: pluginId,
  leftMenuLinks: [],
  mainComponent: Comp,
  translationMessages,
  bootstrap,
  pluginRequirements,
  preventComponentRendering: false,
  blockerComponent: null,
  blockerComponentProps: {},
});

// Export store
export { store, apiUrl, pluginId, pluginName, pluginDescription, router };
