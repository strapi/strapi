/**
 * app.js
 *
 * This is the entry file for the application,
 * only setup and plugin code.
 */

import { browserHistory } from 'react-router';
import configureStore from './store';

// Create redux store with history
// this uses the singleton browserHistory provided by react-router
// Optionally, this could be changed to leverage a created history
// e.g. `const browserHistory = useRouterHistory(createBrowserHistory)();`
const initialState = {};
const store = configureStore(initialState, browserHistory);

// Set up the router, wrapping all Routes in the App component
import App from 'containers/App';
import createRoutes from './routes';
import { translationMessages } from './i18n';

// Plugin identifier based on the package.json `name` value
const pluginId = require('../package.json').name.replace(/^strapi-/i, '');

// Register the plugin
if (window.Strapi) {
  window.Strapi.registerPlugin({
    name: 'Settings Manager',
    id: pluginId,
    leftMenuLink: {
      label: 'Settings Manager',
      to: '/settings-manager',
    },
    mainComponent: App,
    routes: createRoutes(store),
    translationMessages,
  });
}

// Hot reloadable translation json files
if (module.hot) {
  // modules.hot.accept does not accept dynamic dependencies,
  // have to be constants at compile-time
  module.hot.accept('./i18n', () => {
    if (window.Strapi) {
      System.import('./i18n')
        .then((result) => {
          const translationMessagesUpdated = result.translationMessages;
          window.Strapi.refresh(pluginId).translationMessages(translationMessagesUpdated);
        });
    }
  });
}

// API
const apiUrl = window.Strapi && `${window.Strapi.apiUrl}/${pluginId}`;

// Export store
export {
  store,
  apiUrl,
};
