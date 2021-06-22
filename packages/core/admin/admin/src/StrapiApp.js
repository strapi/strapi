import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ThemeProvider } from 'styled-components';
import { LibraryProvider, StrapiAppProvider } from '@strapi/helper-plugin';
import pick from 'lodash/pick';
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
import languageNativeNames from './translations/languageNativeNames';

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
  constructor({ appPlugins, library, locales, middlewares, reducers }) {
    this.appLocales = ['en', ...locales.filter(loc => loc !== 'en')];
    this.appPlugins = appPlugins || {};
    this.library = library;
    this.middlewares = middlewares;
    this.plugins = {};
    this.reducers = reducers;
    this.translations = {};
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

  addCorePluginMenuLink = link => {
    const stringifiedLink = JSON.stringify(link);

    invariant(link.to, `link.to should be defined for ${stringifiedLink}`);
    invariant(
      typeof link.to === 'string',
      `Expected link.to to be a string instead received ${typeof link.to}`
    );
    invariant(
      ['/plugins/content-manager', '/plugins/content-type-builder', '/plugins/upload'].includes(
        link.to
      ),
      'This method is not available for your plugin'
    );
    invariant(
      link.intlLabel?.id && link.intlLabel?.defaultMessage,
      `link.intlLabel.id & link.intlLabel.defaultMessage for ${stringifiedLink}`
    );

    this.menu.push(link);
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

    this.menu.push(link);
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

  async boot() {
    Object.keys(this.appPlugins).forEach(plugin => {
      const boot = this.appPlugins[plugin].boot;

      if (boot) {
        boot({
          addSettingsLink: this.addSettingsLink,
          addSettingsLinks: this.addSettingsLinks,
          getPlugin: this.getPlugin,
          registerHook: this.registerHook,
        });
      }
    });
  }

  createHook = name => {
    this.hooksDict[name] = createHook();
  };

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

  async initialize() {
    Object.keys(this.appPlugins).forEach(plugin => {
      this.appPlugins[plugin].register({
        addComponents: this.addComponents,
        addCorePluginMenuLink: this.addCorePluginMenuLink,
        addFields: this.addFields,
        addMenuLink: this.addMenuLink,
        addMiddlewares: this.addMiddlewares,
        addReducers: this.addReducers,
        createHook: this.createHook,
        createSettingSection: this.createSettingSection,
        registerPlugin: this.registerPlugin,
      });
    });
  }

  async loadAdminTrads() {
    const arrayOfPromises = this.appLocales.map(locale => {
      return import(/* webpackChunkName: "[request]" */ `./translations/${locale}.json`)
        .then(({ default: data }) => {
          return { data, locale };
        })
        .catch(() => {
          return { data: {}, locale };
        });
    });
    const adminLocales = await Promise.all(arrayOfPromises);

    this.translations = adminLocales.reduce((acc, current) => {
      acc[current.locale] = current.data;

      return acc;
    }, {});

    return Promise.resolve();
  }

  async loadTrads() {
    const arrayOfPromises = Object.keys(this.appPlugins)
      .map(plugin => {
        const registerTrads = this.appPlugins[plugin].registerTrads;

        if (registerTrads) {
          return registerTrads({ locales: this.appLocales });
        }

        return null;
      })
      .filter(a => a);

    const pluginsTrads = await Promise.all(arrayOfPromises);
    const mergedTrads = pluginsTrads.reduce((acc, currentPluginTrads) => {
      const pluginTrads = currentPluginTrads.reduce((acc1, current) => {
        acc1[current.locale] = current.data;

        return acc1;
      }, {});

      Object.keys(pluginTrads).forEach(locale => {
        acc[locale] = { ...acc[locale], ...pluginTrads[locale] };
      });

      return acc;
    }, {});

    this.translations = Object.keys(this.translations).reduce((acc, current) => {
      acc[current] = {
        ...this.translations[current],
        ...(mergedTrads[current] || {}),
      };

      return acc;
    }, {});

    return Promise.resolve();
  }

  registerHook = (name, fn) => {
    this.hooksDict[name].register(fn);
  };

  registerPlugin = pluginConf => {
    const plugin = Plugin(pluginConf);

    this.plugins[plugin.pluginId] = plugin;
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
    const localeNames = pick(languageNativeNames, this.appLocales);

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
              menu={this.menu}
              plugins={this.plugins}
              runHookParallel={this.runHookParallel}
              runHookWaterfall={this.runHookWaterfall}
              runHookSeries={this.runHookSeries}
              settings={this.settings}
            >
              <LibraryProvider components={components} fields={fields}>
                <LanguageProvider messages={this.translations} localeNames={localeNames}>
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

export default ({ appPlugins, library, locales, middlewares, reducers }) =>
  new StrapiApp({ appPlugins, library, locales, middlewares, reducers });
