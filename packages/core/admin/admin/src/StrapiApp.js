import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { lightTheme, darkTheme } from '@strapi/design-system/themes';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import isFunction from 'lodash/isFunction';
import invariant from 'invariant';
import { Helmet } from 'react-helmet';
import { basename, createHook } from './core/utils';
import configureStore from './core/store/configureStore';
import { customFields, Plugin } from './core/apis';
import App from './pages/App';
import AuthLogo from './assets/images/logo_strapi_auth_v4.png';
import MenuLogo from './assets/images/logo_strapi_menu.png';
import Providers from './components/Providers';
import languageNativeNames from './translations/languageNativeNames';
import {
  INJECT_COLUMN_IN_TABLE,
  MUTATE_COLLECTION_TYPES_LINKS,
  MUTATE_EDIT_VIEW_LAYOUT,
  MUTATE_SINGLE_TYPES_LINKS,
} from './exposedHooks';
import injectionZones from './injectionZones';
import favicon from './favicon.ico';

class StrapiApp {
  constructor({ adminConfig, appPlugins, library, middlewares, reducers }) {
    this.customConfigurations = adminConfig.config;
    this.customBootstrapConfiguration = adminConfig.bootstrap;
    this.configurations = {
      authLogo: AuthLogo,
      head: { favicon },
      locales: ['en'],
      menuLogo: MenuLogo,
      notifications: { releases: true },
      themes: { light: lightTheme, dark: darkTheme },
      translations: {},
      tutorials: true,
    };
    this.appPlugins = appPlugins || {};
    this.library = library;
    this.middlewares = middlewares;
    this.plugins = {};
    this.reducers = reducers;
    this.translations = {};
    this.hooksDict = {};
    this.admin = {
      injectionZones,
    };
    this.customFields = customFields;

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
      ['/plugins/content-type-builder', '/plugins/upload'].includes(link.to),
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
    invariant(
      link.icon && typeof link.icon === 'function',
      `link.Icon should be a valid React Component`
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

  async bootstrap() {
    Object.keys(this.appPlugins).forEach(plugin => {
      const bootstrap = this.appPlugins[plugin].bootstrap;

      if (bootstrap) {
        bootstrap({
          addSettingsLink: this.addSettingsLink,
          addSettingsLinks: this.addSettingsLinks,
          getPlugin: this.getPlugin,
          injectContentManagerComponent: this.injectContentManagerComponent,
          injectAdminComponent: this.injectAdminComponent,
          registerHook: this.registerHook,
        });
      }
    });

    if (isFunction(this.customBootstrapConfiguration)) {
      this.customBootstrapConfiguration({
        addComponents: this.addComponents,
        addFields: this.addFields,
        addMenuLink: this.addMenuLink,
        addReducers: this.addReducers,
        addSettingsLink: this.addSettingsLink,
        addSettingsLinks: this.addSettingsLinks,
        getPlugin: this.getPlugin,
        injectContentManagerComponent: this.injectContentManagerComponent,
        injectAdminComponent: this.injectAdminComponent,
        registerHook: this.registerHook,
      });
    }
  }

  bootstrapAdmin = async () => {
    await this.createCustomConfigurations();

    this.createHook(INJECT_COLUMN_IN_TABLE);
    this.createHook(MUTATE_COLLECTION_TYPES_LINKS);
    this.createHook(MUTATE_SINGLE_TYPES_LINKS);
    this.createHook(MUTATE_EDIT_VIEW_LAYOUT);

    return Promise.resolve();
  };

  createCustomConfigurations = async () => {
    if (this.customConfigurations?.locales) {
      this.configurations.locales = [
        'en',
        ...this.customConfigurations.locales?.filter(loc => loc !== 'en'),
      ];
    }

    if (this.customConfigurations?.auth?.logo) {
      this.configurations.authLogo = this.customConfigurations.auth.logo;
    }

    if (this.customConfigurations?.menu?.logo) {
      this.configurations.menuLogo = this.customConfigurations.menu.logo;
    }

    if (this.customConfigurations?.head?.favicon) {
      this.configurations.head.favicon = this.customConfigurations.head.favicon;
    }

    if (this.customConfigurations?.theme) {
      merge(this.configurations.themes.light, this.customConfigurations.theme);
    }

    if (this.customConfigurations?.notifications?.releases !== undefined) {
      this.configurations.notifications.releases = this.customConfigurations.notifications.releases;
    }

    if (this.customConfigurations?.tutorials !== undefined) {
      this.configurations.tutorials = this.customConfigurations.tutorials;
    }
  };

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

  getAdminInjectedComponents = (moduleName, containerName, blockName) => {
    try {
      return this.admin.injectionZones[moduleName][containerName][blockName] || [];
    } catch (err) {
      console.error('Cannot get injected component', err);

      return err;
    }
  };

  getPlugin = pluginId => {
    return this.plugins[pluginId];
  };

  async initialize() {
    Object.keys(this.appPlugins).forEach(plugin => {
      this.appPlugins[plugin].register(this);
    });
  }

  injectContentManagerComponent = (containerName, blockName, component) => {
    invariant(
      this.admin.injectionZones.contentManager[containerName]?.[blockName],
      `The ${containerName} ${blockName} zone is not defined in the content manager`
    );
    invariant(component, 'A Component must be provided');

    this.admin.injectionZones.contentManager[containerName][blockName].push(component);
  };

  injectAdminComponent = (containerName, blockName, component) => {
    invariant(
      this.admin.injectionZones.admin[containerName]?.[blockName],
      `The ${containerName} ${blockName} zone is not defined in the admin`
    );
    invariant(component, 'A Component must be provided');

    this.admin.injectionZones.admin[containerName][blockName].push(component);
  };

  /**
   * Load the admin translations
   * @returns {Object} The imported admin translations
   */
  async loadAdminTrads() {
    const arrayOfPromises = this.configurations.locales.map(locale => {
      return import(/* webpackChunkName: "[request]" */ `./translations/${locale}.json`)
        .then(({ default: data }) => {
          return { data, locale };
        })
        .catch(() => {
          return { data: null, locale };
        });
    });
    const adminLocales = await Promise.all(arrayOfPromises);

    const translations = adminLocales.reduce((acc, current) => {
      if (current.data) {
        acc[current.locale] = current.data;
      }

      return acc;
    }, {});

    return translations;
  }

  /**
   * Load the application's translations and merged the custom translations
   * with the default ones.
   *
   */
  async loadTrads() {
    const adminTranslations = await this.loadAdminTrads();

    const arrayOfPromises = Object.keys(this.appPlugins)
      .map(plugin => {
        const registerTrads = this.appPlugins[plugin].registerTrads;

        if (registerTrads) {
          return registerTrads({ locales: this.configurations.locales });
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

    const translations = this.configurations.locales.reduce((acc, current) => {
      acc[current] = {
        ...adminTranslations[current],
        ...(mergedTrads[current] || {}),
        ...this.customConfigurations?.translations?.[current],
      };

      return acc;
    }, {});

    this.configurations.translations = translations;

    return Promise.resolve();
  }

  registerHook = (name, fn) => {
    invariant(
      this.hooksDict[name],
      `The hook ${name} is not defined. You are trying to register a hook that does not exist in the application.`
    );
    this.hooksDict[name].register(fn);
  };

  registerPlugin = pluginConf => {
    const plugin = Plugin(pluginConf);

    this.plugins[plugin.pluginId] = plugin;
  };

  runHookSeries = (name, asynchronous = false) =>
    asynchronous ? this.hooksDict[name].runSeriesAsync() : this.hooksDict[name].runSeries();

  runHookWaterfall = (name, initialValue, asynchronous = false, store) => {
    return asynchronous
      ? this.hooksDict[name].runWaterfallAsync(initialValue, store)
      : this.hooksDict[name].runWaterfall(initialValue, store);
  };

  runHookParallel = name => this.hooksDict[name].runParallel();

  render() {
    const store = this.createStore();
    const localeNames = pick(languageNativeNames, this.configurations.locales || []);

    const {
      components: { components },
      fields: { fields },
    } = this.library;

    return (
      <Providers
        authLogo={this.configurations.authLogo}
        components={components}
        fields={fields}
        customFields={this.customFields}
        localeNames={localeNames}
        getAdminInjectedComponents={this.getAdminInjectedComponents}
        getPlugin={this.getPlugin}
        messages={this.configurations.translations}
        menu={this.menu}
        menuLogo={this.configurations.menuLogo}
        plugins={this.plugins}
        runHookParallel={this.runHookParallel}
        runHookWaterfall={(name, initialValue, async = false) => {
          return this.runHookWaterfall(name, initialValue, async, store);
        }}
        runHookSeries={this.runHookSeries}
        themes={this.configurations.themes}
        settings={this.settings}
        showTutorials={this.configurations.tutorials}
        showReleaseNotification={this.configurations.notifications.releases}
        store={store}
      >
        <>
          <Helmet
            link={[
              {
                rel: 'icon',
                type: 'image/png',
                href: this.configurations.head.favicon,
              },
            ]}
          />
          <BrowserRouter basename={basename}>
            <App store={store} />
          </BrowserRouter>
        </>
      </Providers>
    );
  }
}

export default ({ adminConfig = {}, appPlugins, library, middlewares, reducers }) =>
  new StrapiApp({ adminConfig, appPlugins, library, middlewares, reducers });
