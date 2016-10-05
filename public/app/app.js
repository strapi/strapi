/**
 * app.js
 *
 * This is the entry file for the application, only setup and plugin
 * code.
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

// Register the plugin
if (window.Strapi) {
  window.Strapi.registerPlugin({
    name: 'Settings Manager',
    id: 'settings-manager',
    leftMenuLink: {
      label: 'Settings Manager',
      to: '/settings-manager',
    },
    mainComponent: App,
    routes: createRoutes(store),
  });
}

// Export store
export {
  store,
};