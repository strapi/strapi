// /**
//  *
//  * app.js
//  *
//  * Entry point of the application
//  */

/* eslint-disable */

import '@babel/polyfill';
import 'sanitize.css/sanitize.css';

// Third party css library needed
import 'react-datetime/css/react-datetime.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/js/all.min.js';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { merge } from 'lodash';
import { Fonts } from '@buffetjs/styles';
import { freezeApp, pluginLoaded, unfreezeApp, updatePlugin } from './containers/App/actions';
import { showNotification } from './containers/NotificationProvider/actions';

import basename from './utils/basename';
import injectReducer from './utils/injectReducer';
import injectSaga from './utils/injectSaga';

// Import root component
import App from './containers/App';
// Import Language provider
import LanguageProvider from './containers/LanguageProvider';

import configureStore from './configureStore';
import { SETTINGS_BASE_URL } from './config';

// Import i18n messages
import { translationMessages, languages } from './i18n';

// Create redux store with history
import history from './utils/history';

import plugins from './plugins';

const initialState = {};
const store = configureStore(initialState, history);
const { dispatch } = store;
const MOUNT_NODE = document.getElementById('app') || document.createElement('div');

Object.keys(plugins).forEach(current => {
  const registerPlugin = plugin => {
    return plugin;
  };
  const currentPluginFn = plugins[current];
  const plugin = currentPluginFn({
    registerPlugin,
    settingsBaseURL: SETTINGS_BASE_URL || '/settings',
  });

  const pluginTradsPrefixed = languages.reduce((acc, lang) => {
    const currentLocale = plugin.trads[lang];

    if (currentLocale) {
      const localeprefixedWithPluginId = Object.keys(currentLocale).reduce((acc2, current) => {
        acc2[`${plugin.id}.${current}`] = currentLocale[current];

        return acc2;
      }, {});

      acc[lang] = localeprefixedWithPluginId;
    }

    return acc;
  }, {});

  try {
    merge(translationMessages, pluginTradsPrefixed);
    dispatch(pluginLoaded(plugin));
  } catch (err) {
    console.log({ err });
  }
});

// TODO
const remoteURL = (() => {
  // Relative URL (ex: /dashboard)
  if (REMOTE_URL[0] === '/') {
    return (window.location.origin + REMOTE_URL).replace(/\/$/, '');
  }

  return REMOTE_URL.replace(/\/$/, '');
})();

const displayNotification = (message, status) => {
  dispatch(showNotification(message, status));
};
const lockApp = data => {
  dispatch(freezeApp(data));
};
const unlockApp = () => {
  dispatch(unfreezeApp());
};

window.strapi = Object.assign(window.strapi || {}, {
  node: MODE || 'host',
  env: NODE_ENV,
  remoteURL,
  backendURL: BACKEND_URL === '/' ? window.location.origin : BACKEND_URL,
  notification: {
    success: message => {
      displayNotification(message, 'success');
    },
    warning: message => {
      displayNotification(message, 'warning');
    },
    error: message => {
      displayNotification(message, 'error');
    },
    info: message => {
      displayNotification(message, 'info');
    },
  },
  refresh: pluginId => ({
    translationMessages: translationMessagesUpdated => {
      render(merge({}, translationMessages, translationMessagesUpdated));
    },
    leftMenuSections: leftMenuSectionsUpdated => {
      store.dispatch(updatePlugin(pluginId, 'leftMenuSections', leftMenuSectionsUpdated));
    },
  }),
  router: history,
  languages,
  currentLanguage:
    window.localStorage.getItem('strapi-admin-language') ||
    window.navigator.language ||
    window.navigator.userLanguage ||
    'en',
  lockApp,
  unlockApp,
  injectReducer,
  injectSaga,
  store,
});

const render = messages => {
  ReactDOM.render(
    <Provider store={store}>
      <Fonts />
      <LanguageProvider messages={messages}>
        <BrowserRouter basename={basename}>
          <App store={store} />
        </BrowserRouter>
      </LanguageProvider>
    </Provider>,
    MOUNT_NODE
  );
};

if (module.hot) {
  module.hot.accept(['./i18n', './containers/App'], () => {
    ReactDOM.unmountComponentAtNode(MOUNT_NODE);

    render(translationMessages);
  });
}

if (NODE_ENV !== 'test') {
  // Chunked polyfill for browsers without Intl support
  if (!window.Intl) {
    new Promise(resolve => {
      resolve(import('intl'));
    })
      .then(() =>
        Promise.all([
          import('intl/locale-data/jsonp/en.js'),
          import('intl/locale-data/jsonp/de.js'),
        ])
      )
      .then(() => render(translationMessages))
      .catch(err => {
        throw err;
      });
  } else {
    render(translationMessages);
  }
}

// @Pierre Burgy exporting dispatch for the notifications...
export { dispatch };

// TODO remove this for the new Cypress tests
if (window.Cypress) {
  window.__store__ = Object.assign(window.__store__ || {}, { store });
}
