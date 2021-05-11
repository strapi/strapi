import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ThemeProvider } from 'styled-components';
import { StrapiProvider } from '@strapi/helper-plugin';
import configureStore from './core/store/configureStore';
import { Components, Fields, Plugin } from './core/apis';
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
import translations from './translations';

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

// FIXME
const appLocales = Object.keys(translations);

class StrapiApp {
  constructor({ appPlugins }) {
    this.appPlugins = appPlugins || {};
    this.componentApi = Components();
    this.fieldApi = Fields();
    this.middlewares = [];
    this.plugins = {};
    this.reducers = { ...reducers };
    this.translations = translations;
  }

  addMiddleware(middleware) {
    this.middlewares.push(middleware);
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
  }

  async boot() {
    Object.keys(this.appPlugins).forEach(plugin => {
      const boot = this.appPlugins[plugin].boot;

      if (boot) {
        boot(this);
      }
    });
  }

  getPlugin(pluginId) {
    return this.plugins[pluginId] || null;
  }

  // FIXME
  registerPluginTranslations(pluginId, trads) {
    const pluginTranslations = appLocales.reduce((acc, currentLanguage) => {
      const currentLocale = trads[currentLanguage];

      if (currentLocale) {
        const localeprefixedWithPluginId = Object.keys(currentLocale).reduce((acc2, current) => {
          acc2[`${pluginId}.${current}`] = currentLocale[current];

          return acc2;
        }, {});

        acc[currentLanguage] = localeprefixedWithPluginId;
      }

      return acc;
    }, {});

    this.translations = Object.keys(this.translations).reduce((acc, current) => {
      acc[current] = {
        ...this.translations[current],
        ...(pluginTranslations[current] || {}),
      };

      return acc;
    }, {});
  }

  registerPlugin(pluginConf) {
    const plugin = Plugin(pluginConf);

    this.plugins[plugin.pluginId] = plugin;

    // FIXME
    // Translations should be loaded differently
    // This is a temporary fix

    this.registerPluginTranslations(plugin.pluginId, plugin.trads);
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
              <LanguageProvider messages={this.translations}>
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
