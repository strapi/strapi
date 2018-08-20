/**
 * app.js
 *
 * This is the entry file for the application, only setup and boilerplate
 * code.
 */

/* eslint-disable */
import './public-path';
import 'babel-polyfill';
/* eslint-disable no-console */
// Import all the third party stuff
import { Provider } from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';
import { ConnectedRouter } from 'react-router-redux';
import createHistory from 'history/createBrowserHistory';
import { merge, isFunction } from 'lodash';
import 'sanitize.css/sanitize.css';
import 'whatwg-fetch';

import LanguageProvider from 'containers/LanguageProvider';

import App from 'containers/App';
import { showNotification } from 'containers/NotificationProvider/actions';
import {
  freezeApp,
  pluginLoaded,
  unfreezeApp,
  unsetHasUserPlugin,
  updatePlugin,
} from 'containers/App/actions';

import auth from 'utils/auth';
import configureStore from './store';
import { translationMessages, languages } from './i18n';
import { findIndex } from 'lodash';

const plugins = (() => {
  try {
    return require('./config/plugins.json');
  } catch (e) {
    return [];
  }
})();
/* eslint-enable */

// Create redux store with history
const basename = strapi.remoteURL.replace(window.location.origin, '');
const history = createHistory({
  basename,
});
const store = configureStore({}, history);

const render = (translatedMessages) => {
  ReactDOM.render(
    <Provider store={store}>
      <LanguageProvider messages={translatedMessages}>
        <ConnectedRouter history={history}>
          <App />
        </ConnectedRouter>
      </LanguageProvider>
    </Provider>,
    document.getElementById('app')
  );
};

// Hot reloadable translation json files
if (module.hot) {
  // modules.hot.accept does not accept dynamic dependencies,
  // have to be constants at compile-time
  module.hot.accept('./i18n', () => {
    render(translationMessages);
  });
}

// Chunked polyfill for browsers without Intl support
window.onload = function onLoad() {
  if (!window.Intl) {
    Promise.all([
      System.import('intl'),
      System.import('intl/locale-data/jsonp/en.js'),
      System.import('intl/locale-data/jsonp/fr.js'),
    ]).then(() => render(translationMessages));
  } else {
    render(translationMessages);
  }
};

// Don't inject plugins in development mode.
if (window.location.port !== '4000') {
  fetch(`${strapi.remoteURL}/config/plugins.json`)
    .then(response => {
      return response.json();
    })
    .then(plugins => {
      if (findIndex(plugins, ['id', 'users-permissions']) === -1) {
        store.dispatch(unsetHasUserPlugin());
      }

      const $body = document.getElementsByTagName('body')[0];

      (plugins || []).forEach(plugin => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.onerror = function (oError) {
          const source = new URL(oError.target.src);
          const url = new URL(`${strapi.remoteURL}`);

          if (!source || !url) {
            throw new Error(`Impossible to load: ${oError.target.src}`);
          }

          // Remove tag.
          $body.removeChild(script);

          // New attempt with new src.
          const newScript = document.createElement('script');
          newScript.type = 'text/javascript';
          newScript.src = `${url.origin}${source.pathname}`;
          $body.appendChild(newScript);
        };

        script.src = plugin.source[process.env.NODE_ENV].indexOf('://') === -1 ?
          `${basename}${plugin.source[process.env.NODE_ENV]}`.replace('//', '/'): // relative
          plugin.source[process.env.NODE_ENV]; // absolute

        $body.appendChild(script);
      });
    })
    .catch(err => {
      console.log(err); // eslint-disable-line no-console
    });
} else if (findIndex(plugins, ['id', 'users-permissions']) === -1) {
  store.dispatch(unsetHasUserPlugin());
}

// const isPluginAllowedToRegister = (plugin) => true;
const isPluginAllowedToRegister = (plugin) => plugin.id === 'users-permissions' || plugin.id === 'email' || auth.getToken();

/**
 * Register a plugin
 *
 * @param params
 */
const registerPlugin = (plugin) => {
  // Merge admin translation messages
  merge(translationMessages, plugin.translationMessages);

  plugin.leftMenuSections = plugin.leftMenuSections || [];
  const shouldAllowRegister = isPluginAllowedToRegister(plugin) !== null;

  switch (true) {
    // Execute bootstrap function and check if plugin can be rendered
    case isFunction(plugin.bootstrap) && isFunction(plugin.pluginRequirements) && shouldAllowRegister:
      plugin.pluginRequirements(plugin)
        .then(plugin => {
          return plugin.bootstrap(plugin);
        })
        .then(plugin => {
          store.dispatch(pluginLoaded(plugin));
        });
      break;
    // Check if plugin can be rendered
    case isFunction(plugin.pluginRequirements):
      plugin.pluginRequirements(plugin).then(plugin => {
        store.dispatch(pluginLoaded(plugin));
      });
      break;
    // Execute bootstrap function
    case isFunction(plugin.bootstrap) && shouldAllowRegister:
      plugin.bootstrap(plugin).then(plugin => {
        store.dispatch(pluginLoaded(plugin));
      });
      break;
    default:
      store.dispatch(pluginLoaded(plugin));
  }
};

const displayNotification = (message, status) => {
  store.dispatch(showNotification(message, status));
};

const lockApp = () => {
  store.dispatch(freezeApp());
};

const unlockApp = () => {
  store.dispatch(unfreezeApp());
};

/**
 * Public Strapi object exposed to the `window` object
 */

window.strapi = Object.assign(window.strapi || {}, {
  mode: process.env.MODE || 'host',
  registerPlugin,
  notification: {
    success: (message) => {
      displayNotification(message, 'success');
    },
    warning: (message) => {
      displayNotification(message, 'warning');
    },
    error: (message) => {
      displayNotification(message, 'error');
    },
    info: (message) => {
      displayNotification(message, 'info');
    },
  },
  refresh: (pluginId) => ({
    translationMessages: (translationMessagesUpdated) => {
      render(merge({}, translationMessages, translationMessagesUpdated));
    },
    leftMenuSections: (leftMenuSectionsUpdated) => {
      store.dispatch(updatePlugin(pluginId, 'leftMenuSections', leftMenuSectionsUpdated));
    },
  }),
  router: history,
  languages,
  currentLanguage: window.localStorage.getItem('strapi-admin-language') ||  window.navigator.language ||  window.navigator.userLanguage || 'en',
  lockApp,
  unlockApp,
});

const dispatch = store.dispatch;
export {
  dispatch,
};
