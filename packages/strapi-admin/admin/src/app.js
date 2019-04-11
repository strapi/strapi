// /**
//  *
//  * app.js
//  *
//  * Entry point of the application
//  */

import '@babel/polyfill';
import 'sanitize.css/sanitize.css';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'react-router-redux';

import { merge } from 'lodash';
import {
  freezeApp,
  pluginLoaded,
  unfreezeApp,
  updatePlugin,
} from './containers/App/actions';
import { showNotification } from './containers/NotificationProvider/actions';
import injectReducer from './utils/injectReducer';
import injectSaga from './utils/injectSaga';

// Import root component
import App from './containers/App';
// Import Language provider
import LanguageProvider from './containers/LanguageProvider';

import configureStore from './configureStore';

// Import i18n messages
import { translationMessages, languages } from './i18n';

// Create redux store with history
import history from './utils/history';
const initialState = {};
const store = configureStore(initialState, history);
const { dispatch } = store;
const MOUNT_NODE = document.getElementById('app');

// TODO
const remoteURL = (() => {
  if (window.location.port === '4000') {
    return 'http://localhost:4000/admin';
  }

  // Relative URL (ex: /dashboard)
  if (process.env.REMOTE_URL[0] === '/') {
    return (window.location.origin + process.env.REMOTE_URL).replace(/\/$/, '');
  }

  return process.env.REMOTE_URL.replace(/\/$/, '');
})();

const registerPlugin = plugin => {
  // Merge admin translation messages
  merge(translationMessages, plugin.translationMessages);

  plugin.leftMenuSections = plugin.leftMenuSections || [];

  dispatch(pluginLoaded(plugin));
};
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
  remoteURL,
  backendURL: BACKEND_URL,
  registerPlugin,
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
      store.dispatch(
        updatePlugin(pluginId, 'leftMenuSections', leftMenuSectionsUpdated),
      );
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
      <LanguageProvider messages={messages}>
        <ConnectedRouter history={history}>
          <App store={store} />
        </ConnectedRouter>
      </LanguageProvider>
    </Provider>,
    MOUNT_NODE,
  );
};

if (module.hot) {
  module.hot.accept(['./i18n', './containers/App'], () => {
    ReactDOM.unmountComponentAtNode(MOUNT_NODE);

    render(translationMessages);
  });
}

// Chunked polyfill for browsers without Intl support
if (!window.Intl) {
  new Promise(resolve => {
    resolve(import('intl'));
  })
    .then(() =>
      Promise.all([
        import('intl/locale-data/jsonp/en.js'),
        import('intl/locale-data/jsonp/de.js'),
      ]),
    ) // eslint-disable-line prettier/prettier
    .then(() => render(translationMessages))
    .catch(err => {
      throw err;
    });
} else {
  render(translationMessages);
}

// cc/ @Pierre Burgy exporting dispatch for the notifications
export { dispatch };
