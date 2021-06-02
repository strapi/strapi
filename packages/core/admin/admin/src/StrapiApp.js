import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ThemeProvider } from 'styled-components';
import { LibraryProvider, StrapiAppProvider } from '@strapi/helper-plugin';
import createHook from '@strapi/hooks';
import configureStore from './core/store/configureStore';
import { Plugin } from './core/apis';
import basename from './utils/basename';
import App from './pages/App';
import LanguageProvider from './components/LanguageProvider';
import AutoReloadOverlayBlockerProvider from './components/AutoReloadOverlayBlockerProvider';
import OverlayBlocker from './components/OverlayBlocker';
import Fonts from './components/Fonts';
import GlobalStyle from './components/GlobalStyle';
import Notifications from './components/Notifications';
import themes from './themes';

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

const appLocales = Object.keys(translations);

class StrapiApp {
  constructor({ appPlugins, library, middlewares, reducers }) {
    this.appPlugins = appPlugins || {};
    this.library = library;
    this.middlewares = middlewares;
    this.plugins = {};
    this.reducers = reducers;
    this.translations = translations;
    this.hooksDict = {};
  }

  addComponents = components => {
    if (Array.isArray(components)) {
      components.map(compo => this.library.components.add(compo));
    } else {
      this.library.components.add(components);
    }
  };

  addFields = fields => {
    if (Array.isArray(fields)) {
      fields.map(field => this.library.fields.add(field));
    } else {
      this.library.fields.add(fields);
    }
  };

  addMiddlewares = middlewares => {
    middlewares.forEach(middleware => {
      this.middlewares.add(middleware);
    });
  };

  addReducers = reducers => {
    Object.keys(reducers).forEach(reducerName => {
      this.reducers.add(reducerName, reducers[reducerName]);
    });
  };

  async initialize() {
    Object.keys(this.appPlugins).forEach(plugin => {
      this.appPlugins[plugin].register({
        addComponents: this.addComponents,
        addFields: this.addFields,
        addMiddlewares: this.addMiddlewares,
        addReducers: this.addReducers,
        registerPlugin: this.registerPlugin,
      });
    });
  }

  async boot() {
    Object.keys(this.appPlugins).forEach(plugin => {
      const boot = this.appPlugins[plugin].boot;

      if (boot) {
        boot({ getPlugin: this.getPlugin });
      }
    });
  }

  createStore = () => {
    const store = configureStore(this.middlewares.middlewares, this.reducers.reducers);

    return store;
  };

  getPlugin = pluginId => {
    return this.plugins[pluginId];
  };

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

  registerPlugin = pluginConf => {
    // FIXME
    // Translations should be loaded differently
    // This is a temporary fix
    this.registerPluginTranslations(pluginConf.id, pluginConf.trads);

    const plugin = Plugin(pluginConf);

    this.plugins[plugin.pluginId] = plugin;
  };

  createHook = name => {
    this.hooksDict[name] = createHook();
  };

  registerHook = (name, fn) => {
    this.hooksDict[name].register(fn);
  };

  runHookSeries = (name, asynchronous = false) =>
    asynchronous ? this.hooksDict[name].runSeriesAsync() : this.hooksDict[name].runSeries();

  runHookWaterfall = (name, initialValue, asynchronous = false) =>
    asynchronous
      ? this.hooksDict[name].runWaterfallAsync(initialValue)
      : this.hooksDict[name].runWaterfall(initialValue);

  runHookParallel = name => this.hooksDict[name].runParallel();

  render() {
    const store = this.createStore();

    const {
      components: { components },
      fields: { fields },
    } = this.library;

    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={themes}>
          <GlobalStyle />
          <Fonts />
          <Provider store={store}>
            <StrapiAppProvider getPlugin={this.getPlugin} plugins={this.plugins}>
              <LibraryProvider components={components} fields={fields}>
                <LanguageProvider messages={this.translations}>
                  <AutoReloadOverlayBlockerProvider>
                    <OverlayBlocker>
                      <Notifications>
                        <BrowserRouter basename={basename}>
                          <App store={store} />
                        </BrowserRouter>
                      </Notifications>
                    </OverlayBlocker>
                  </AutoReloadOverlayBlockerProvider>
                </LanguageProvider>
              </LibraryProvider>
            </StrapiAppProvider>
          </Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
}

export default ({ appPlugins, library, middlewares, reducers }) =>
  new StrapiApp({ appPlugins, library, middlewares, reducers });
