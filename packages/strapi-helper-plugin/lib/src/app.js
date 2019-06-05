/**
 * app.js
 *
 * This is the entry file for the application,
 * only setup and plugin code.
 */

/* eslint-disable */
// Don't move this line!
// import './public-path.js'; // eslint-disable-line import/extensions

import React from 'react';
// import Loadable from 'react-loadable';
// import LoadingIndicatorPage from './components/LoadingIndicatorPage';
import { translationMessages } from './i18n';
import App from 'containers/App';

// const LoadableApp = Loadable({
//   loader: () => import('containers/App'),
//   loading: LoadingIndicatorPage,
// });

// const tryRequireRoot = source => {
//   try {
//     return require('../../../../admin/src/' + source + '.js').default; // eslint-disable-line prefer-template
//   } catch (err) {
//     return null;
//   }
// };

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
// const store = configureStore({}, strapi.router, pluginName);
const store = strapi.store;

// Define the plugin root component
function Comp(props) {
  return <App {...props} />;
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

// Require the Initializer component
const initializer = (() => {
  try {
    return require('../../../../admin/src/initializer.js'); // eslint-disable-line import/no-unresolved
  } catch (err) {
    return null;
  }
})();

// Require the plugin's lifecycle
const lifecycles = (() => {
  try {
    return require('../../../../admin/src/lifecycles.js'); // eslint-disable-line import/no-unresolved
  } catch (err) {
    return null;
  }
})();

// Register the plugin.
strapi.registerPlugin({
  blockerComponent: null,
  blockerComponentProps: {},
  description: pluginDescription,
  icon: pluginPkg.strapi.icon,
  id: pluginId,
  initializer,
  injectedComponents,
  layout,
  lifecycles,
  leftMenuLinks: [],
  leftMenuSections: [],
  mainComponent: Comp,
  name: pluginPkg.strapi.name,
  preventComponentRendering: false,
  translationMessages,
});

// Export store
export { store, apiUrl, pluginId, pluginName, pluginDescription, router };
