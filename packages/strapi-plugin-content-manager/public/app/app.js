/**
 * app.js
 *
 * This is the entry file for the application,
 * only setup and plugin code.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { syncHistoryWithStore } from 'react-router-redux';

import App from './containers/App';
import createRoutes from './routes';
import configureStore from './store';
import { selectLocationState } from './containers/App/selectors';
import { translationMessages } from './i18n';

// Plugin identifier based on the package.json `name` value
const pluginId = require('../package.json').name.replace(
  /^strapi-plugin-/i,
  ''
);
const apiUrl = window.Strapi && `${window.Strapi.apiUrl}/${pluginId}`;
const router = window.Strapi.router;

// Create redux store with history
// this uses the singleton browserHistory provided by react-router
// Optionally, this could be changed to leverage a created history
// e.g. `const browserHistory = useRouterHistory(createBrowserHistory)();`
const store = configureStore({}, window.Strapi.router);

// Sync history and store, as the react-router-redux reducer
// is under the non-default key ("routing"), selectLocationState
// must be provided for resolving how to retrieve the "route" in the state
syncHistoryWithStore(window.Strapi.router, store, {
  selectLocationState: selectLocationState(),
});

// Define the plugin root component
function Comp(props) {
  return (
    <Provider store={store}>
      <App {...props} />
    </Provider>
  );
}

// Add contextTypes to get access to the admin router
Comp.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

// Register the plugin
if (window.Strapi) {
  window.Strapi.registerPlugin({
    name: 'Content Manager',
    icon: 'ion-document-text',
    id: pluginId,
    leftMenuLinks: [],
    mainComponent: Comp,
    routes: createRoutes(store),
    translationMessages,
  });
}

// Export store
export { store, apiUrl, pluginId, router };
