import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ThemeProvider } from 'styled-components';
import { LibraryProvider, StrapiAppProvider } from '@strapi/helper-plugin';
import createHook from '@strapi/hooks';
import invariant from 'invariant';
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
    this.menu = [];
    this.settings = {
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [],
      },
    };
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

  addMenuLink = link => {
    const stringifiedLink = JSON.stringify(link);

    invariant(link.to, `link.to should be defined for ${stringifiedLink}`);
    invariant(
      typeof link.to === 'string',
      `Expected link.to to be a string instead received ${typeof link.to}`
    );
    invariant(
      link.intlLabel?.id && link.intlLabel?.defaultMessage,
      `link.intlLabel.id & link.intlLabel.defaultMessage for ${stringifiedLink}`
    );
    invariant(
      link.Component && typeof link.Component === 'function',
      `link.Component should be a valid React Component`
    );
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

  addSettingsLink = (sectionId, link) => {
    invariant(this.settings[sectionId], 'The section does not exist');

    const stringifiedLink = JSON.stringify(link);

    invariant(link.id, `link.id should be defined for ${stringifiedLink}`);
    invariant(
      link.intlLabel?.id && link.intlLabel?.defaultMessage,
      `link.intlLabel.id & link.intlLabel.defaultMessage for ${stringifiedLink}`
    );
    invariant(link.to, `link.to should be defined for ${stringifiedLink}`);
    invariant(
      link.Component && typeof link.Component === 'function',
      `link.Component should be a valid React Component`
    );

    this.settings[sectionId].links.push(link);
  };

  addSettingsLinks = (sectionId, links) => {
    invariant(this.settings[sectionId], 'The section does not exist');
    invariant(Array.isArray(links), 'TypeError expected links to be an array');

    links.forEach(link => {
      this.addSettingsLink(sectionId, link);
    });
  };

  async initialize() {
    Object.keys(this.appPlugins).forEach(plugin => {
      this.appPlugins[plugin].register({
        addComponents: this.addComponents,
        addFields: this.addFields,
        addMenuLink: this.addMenuLink,
        addMiddlewares: this.addMiddlewares,
        addReducers: this.addReducers,
        createSettingSection: this.createSettingSection,
        registerPlugin: this.registerPlugin,
      });
    });
  }

  async boot() {
    Object.keys(this.appPlugins).forEach(plugin => {
      const boot = this.appPlugins[plugin].boot;

      if (boot) {
        boot({
          addSettingsLink: this.addSettingsLink,
          addSettingsLinks: this.addSettingsLinks,
          getPlugin: this.getPlugin,
        });
      }
    });
  }

  createSettingSection = (section, links) => {
    invariant(section.id, 'section.id should be defined');
    invariant(
      section.intlLabel?.id && section.intlLabel?.defaultMessage,
      'section.intlLabel should be defined'
    );

    invariant(Array.isArray(links), 'TypeError expected links to be an array');
    invariant(this.settings[section.id] === undefined, 'A similar section already exists');

    this.settings[section.id] = { ...section, links: [] };

    links.forEach(link => {
      this.addSettingsLink(section.id, link);
    });
  };

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
            <StrapiAppProvider
              getPlugin={this.getPlugin}
              plugins={this.plugins}
              runHookParallel={this.runHookParallel}
              runHookWaterfall={this.runHookWaterfall}
              runHookSeries={this.runHookSeries}
              settings={this.settings}
            >
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
