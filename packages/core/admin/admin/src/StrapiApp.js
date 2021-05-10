import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ThemeProvider } from 'styled-components';
import { StrapiProvider } from '@strapi/helper-plugin';
import configureStore from './core/store/configureStore';
import { Middlewares, Plugin } from './core/apis';
import basename from './utils/basename';
import App from './pages/App';
import LanguageProvider from './components/LanguageProvider';
import AutoReloadOverlayBlocker from './components/AutoReloadOverlayBlocker';
import Fonts from './components/Fonts';
import OverlayBlocker from './components/OverlayBlocker';
import GlobalStyle from './components/GlobalStyle';
import Notifications from './components/Notifications';
import themes from './themes';

import reducers from './reducers';

// TODO
import translationMessages from './translations';

window.strapi = {
  backendURL: process.env.STRAPI_ADMIN_BACKEND_URL,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

class StrapiApp {
  constructor({ appPlugins }) {
    this.appPlugins = appPlugins || {};
    this.middlewares = Middlewares();
    this.plugins = {};
    this.reducers = { ...reducers };
  }

  addReducers(reducers) {
    Object.keys(reducers).forEach(reducerName => {
      this.reducers[reducerName] = reducers[reducerName];
    });
  }

  async initialize() {
    Object.keys(this.appPlugins).forEach(plugin => {
      this.appPlugins[plugin].register(this);
    });

    return this;
  }

  async boot() {
    console.log('booting');

    return this;
  }

  getPlugin(pluginId) {
    return this.plugins[pluginId] || null;
  }

  registerPlugin(pluginConf) {
    this.plugins[pluginConf.id] = Plugin(pluginConf);
  }

  render() {
    const store = configureStore(this);

    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={themes}>
          <GlobalStyle />
          <Fonts />
          <Provider store={store}>
            <StrapiProvider strapi={this}>
              <LanguageProvider messages={translationMessages}>
                <>
                  <AutoReloadOverlayBlocker />
                  <OverlayBlocker />
                  <Notifications />
                  <BrowserRouter basename={basename}>
                    <App store={store} />
                  </BrowserRouter>
                </>
              </LanguageProvider>
            </StrapiProvider>
          </Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
}

export default ({ appPlugins }) => new StrapiApp({ appPlugins });
