import { ReducersMapObject } from '@reduxjs/toolkit';
import { darkTheme, lightTheme } from '@strapi/design-system';
import { MenuItem, StrapiAppSetting, StrapiAppSettingLink } from '@strapi/helper-plugin';
import invariant from 'invariant';
import isFunction from 'lodash/isFunction';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import { Helmet } from 'react-helmet';
import { BrowserRouter } from 'react-router-dom';
import { DefaultTheme } from 'styled-components';

import { App } from './App';
import Logo from './assets/images/logo-strapi-2022.svg';
import {
  INJECTION_ZONES,
  InjectionZoneBlock,
  InjectionZoneComponent,
  InjectionZoneContainer,
  InjectionZoneModule,
  InjectionZones,
} from './components/InjectionZone';
import { Providers } from './components/Providers';
import { HOOKS } from './constants';
import { Components, Component } from './core/apis/Components';
import { ContentManagerPlugin } from './core/apis/content-manager';
import { CustomFields } from './core/apis/CustomFields';
import { Field, Fields } from './core/apis/Fields';
import { Middleware, Middlewares } from './core/apis/Middlewares';
import { Plugin, PluginConfig } from './core/apis/Plugin';
import { Reducers } from './core/apis/Reducers';
import { PreloadState, Store, configureStore } from './core/store/configure';
import { getBasename } from './core/utils/basename';
import { Handler, createHook } from './core/utils/createHook';
import { THEME_LOCAL_STORAGE_KEY, LANGUAGE_LOCAL_STORAGE_KEY, ThemeName } from './reducer';
import { languageNativeNames } from './translations/languageNativeNames';

const {
  INJECT_COLUMN_IN_TABLE,
  MUTATE_COLLECTION_TYPES_LINKS,
  MUTATE_EDIT_VIEW_LAYOUT,
  MUTATE_SINGLE_TYPES_LINKS,
} = HOOKS;

interface StrapiAppConstructorArgs extends Partial<Pick<StrapiApp, 'appPlugins'>> {
  adminConfig?: {
    config?: StrapiApp['customConfigurations'];
    bootstrap?: StrapiApp['customBootstrapConfiguration'];
  };
}

interface StrapiAppPlugin {
  bootstrap: (
    args: Pick<
      StrapiApp,
      | 'addSettingsLink'
      | 'addSettingsLinks'
      | 'getPlugin'
      | 'injectContentManagerComponent'
      | 'injectAdminComponent'
      | 'registerHook'
    >
  ) => void;
  register: (app: StrapiApp) => void;
  registerTrads: (args: {
    locales: string[];
  }) => Promise<{ data: Record<string, string>; locale: string }[]>;
}

class StrapiApp {
  admin: {
    injectionZones: InjectionZones;
  };
  appPlugins: Record<string, StrapiAppPlugin>;
  configurations: {
    authLogo: string;
    head: { favicon: string };
    locales: string[];
    menuLogo: string;
    notifications: { releases: boolean };
    themes: { light: DefaultTheme; dark: DefaultTheme };
    translations: Record<string, Record<string, string>>;
    tutorials: boolean;
  };
  customBootstrapConfiguration: unknown;
  customConfigurations: {
    auth?: { logo: string };
    head?: { favicon: string };
    locales?: string[];
    menu?: { logo: string };
    notifications?: { releases: boolean };
    theme?: { light: DefaultTheme; dark: DefaultTheme };
    translations?: Record<string, unknown>;
    tutorials?: boolean;
  };
  customFields: CustomFields;
  hooksDict: Record<string, ReturnType<typeof createHook>>;
  library: {
    components: Components;
    fields: Fields;
  };
  menu: MenuItem[];
  middlewares: Middlewares;
  plugins: Record<string, Plugin>;
  reducers: Reducers;
  settings: Record<string, StrapiAppSetting>;
  translations: StrapiApp['configurations']['translations'];

  /**
   * APIs
   */
  private contentManager = new ContentManagerPlugin();

  constructor({ adminConfig, appPlugins }: StrapiAppConstructorArgs = {}) {
    this.customConfigurations = adminConfig?.config ?? {};
    this.customBootstrapConfiguration = adminConfig?.bootstrap;
    this.configurations = {
      authLogo: Logo,
      head: { favicon: '' },
      locales: ['en'],
      menuLogo: Logo,
      notifications: { releases: true },
      themes: { light: lightTheme, dark: darkTheme },
      translations: {},
      tutorials: true,
    };
    this.appPlugins = appPlugins || {};
    this.library = {
      components: new Components(),
      fields: new Fields(),
    };
    this.middlewares = new Middlewares();
    this.plugins = {};
    this.reducers = new Reducers();
    this.translations = {};
    this.hooksDict = {};
    this.admin = {
      injectionZones: INJECTION_ZONES,
    };
    this.customFields = new CustomFields();
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

    this.registerPlugin(this.contentManager.config);
  }

  addComponents = (components: Component | Component[]) => {
    if (Array.isArray(components)) {
      components.map((compo) => this.library.components.add(compo));
    } else {
      this.library.components.add(components);
    }
  };

  addCorePluginMenuLink = (link: MenuItem) => {
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

  addFields = (fields: Field | Field[]) => {
    if (Array.isArray(fields)) {
      fields.map((field) => this.library.fields.add(field));
    } else {
      this.library.fields.add(fields);
    }
  };

  addMenuLink = (link: MenuItem) => {
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

  addMiddlewares = (middlewares: Middleware[]) => {
    middlewares.forEach((middleware) => {
      this.middlewares.add(middleware);
    });
  };

  addReducers = (reducers: ReducersMapObject) => {
    Object.keys(reducers).forEach((reducerName) => {
      this.reducers.add(reducerName, reducers[reducerName]);
    });
  };

  addSettingsLink = (sectionId: keyof StrapiApp['settings'], link: StrapiAppSettingLink) => {
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

  addSettingsLinks = (sectionId: keyof StrapiApp['settings'], links: StrapiAppSettingLink[]) => {
    invariant(this.settings[sectionId], 'The section does not exist');
    invariant(Array.isArray(links), 'TypeError expected links to be an array');

    links.forEach((link) => {
      this.addSettingsLink(sectionId, link);
    });
  };

  async bootstrap() {
    Object.keys(this.appPlugins).forEach((plugin) => {
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
        ...(this.customConfigurations.locales?.filter((loc) => loc !== 'en') || []),
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
      const darkTheme = this.customConfigurations.theme.dark;
      const lightTheme = this.customConfigurations.theme.light;

      if (!darkTheme && !lightTheme) {
        console.warn(
          `[deprecated] In future versions, Strapi will stop supporting this theme customization syntax. The theme configuration accepts a light and a dark key to customize each theme separately. See https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#theme-extension.`
        );
        merge(this.configurations.themes.light, this.customConfigurations.theme);
      }

      if (lightTheme) merge(this.configurations.themes.light, lightTheme);

      if (darkTheme) merge(this.configurations.themes.dark, darkTheme);
    }

    if (this.customConfigurations?.notifications?.releases !== undefined) {
      this.configurations.notifications.releases = this.customConfigurations.notifications.releases;
    }

    if (this.customConfigurations?.tutorials !== undefined) {
      this.configurations.tutorials = this.customConfigurations.tutorials;
    }
  };

  createHook = (name: string) => {
    this.hooksDict[name] = createHook();
  };

  createSettingSection = (section: StrapiAppSetting, links: StrapiAppSettingLink[]) => {
    invariant(section.id, 'section.id should be defined');
    invariant(
      section.intlLabel?.id && section.intlLabel?.defaultMessage,
      'section.intlLabel should be defined'
    );

    invariant(Array.isArray(links), 'TypeError expected links to be an array');
    invariant(this.settings[section.id] === undefined, 'A similar section already exists');

    this.settings[section.id] = { ...section, links: [] };

    links.forEach((link) => {
      this.addSettingsLink(section.id, link);
    });
  };

  createStore = (preloadedState?: PreloadState) => {
    const store = configureStore(
      preloadedState,
      this.middlewares.middlewares,
      this.reducers.reducers
    );

    return store as Store;
  };

  getAdminInjectedComponents = (
    moduleName: InjectionZoneModule,
    containerName: InjectionZoneContainer,
    blockName: InjectionZoneBlock
  ): InjectionZoneComponent[] => {
    try {
      // @ts-expect-error – we have a catch block so if you don't pass it correctly we still return an array.
      return this.admin.injectionZones[moduleName][containerName][blockName] || [];
    } catch (err) {
      console.error('Cannot get injected component', err);

      return [];
    }
  };

  getPlugin = (pluginId: PluginConfig['id']) => {
    return this.plugins[pluginId];
  };

  async initialize() {
    Object.keys(this.appPlugins).forEach((plugin) => {
      this.appPlugins[plugin].register(this);
    });
  }

  injectContentManagerComponent = <TContainerName extends keyof InjectionZones['contentManager']>(
    containerName: TContainerName,
    blockName: keyof InjectionZones['contentManager'][TContainerName],
    component: InjectionZoneComponent
  ) => {
    invariant(
      this.admin.injectionZones.contentManager[containerName]?.[blockName],
      `The ${containerName} ${String(blockName)} zone is not defined in the content manager`
    );
    invariant(component, 'A Component must be provided');

    // @ts-expect-error – we've alredy checked above that the block exists.
    this.admin.injectionZones.contentManager[containerName][blockName].push(component);
  };

  injectAdminComponent = <TContainerName extends keyof InjectionZones['admin']>(
    containerName: TContainerName,
    blockName: keyof InjectionZones['admin'][TContainerName],
    component: InjectionZoneComponent
  ) => {
    invariant(
      this.admin.injectionZones.admin[containerName]?.[blockName],
      `The ${containerName} ${String(blockName)} zone is not defined in the admin`
    );
    invariant(component, 'A Component must be provided');

    // @ts-expect-error – we've alredy checked above that the block exists.
    this.admin.injectionZones.admin[containerName][blockName].push(component);
  };

  /**
   * Load the admin translations
   * @returns {Object} The imported admin translations
   */
  async loadAdminTrads() {
    const arrayOfPromises = this.configurations.locales.map((locale) => {
      return import(`./translations/${locale}.json`)
        .then(({ default: data }) => {
          return { data, locale };
        })
        .catch(() => {
          return { data: null, locale };
        });
    });
    const adminLocales = await Promise.all(arrayOfPromises);

    const translations = adminLocales.reduce<{ [locale: string]: Record<string, string> }>(
      (acc, current) => {
        if (current.data) {
          acc[current.locale] = current.data;
        }

        return acc;
      },
      {}
    );

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
      .map((plugin) => {
        const registerTrads = this.appPlugins[plugin].registerTrads;

        if (registerTrads) {
          return registerTrads({ locales: this.configurations.locales });
        }

        return null;
      })
      .filter((a) => a);

    type Translation = Awaited<ReturnType<StrapiAppPlugin['registerTrads']>>[number];

    const pluginsTrads = (await Promise.all(arrayOfPromises)) as Array<Translation[]>;
    const mergedTrads = pluginsTrads.reduce<{ [locale: string]: Translation['data'] }>(
      (acc, currentPluginTrads) => {
        const pluginTrads = currentPluginTrads.reduce<{ [locale: string]: Translation['data'] }>(
          (acc1, current) => {
            acc1[current.locale] = current.data;

            return acc1;
          },
          {}
        );

        Object.keys(pluginTrads).forEach((locale) => {
          acc[locale] = { ...acc[locale], ...pluginTrads[locale] };
        });

        return acc;
      },
      {}
    );

    const translations = this.configurations.locales.reduce<{
      [locale: string]: Translation['data'];
    }>((acc, current) => {
      acc[current] = {
        ...adminTranslations[current],
        ...(mergedTrads[current] || {}),
        ...(this.customConfigurations?.translations?.[current] ?? {}),
      };

      return acc;
    }, {});

    this.configurations.translations = translations;

    return Promise.resolve();
  }

  registerHook = (name: string, fn: Handler) => {
    invariant(
      this.hooksDict[name],
      `The hook ${name} is not defined. You are trying to register a hook that does not exist in the application.`
    );
    this.hooksDict[name].register(fn);
  };

  registerPlugin = (pluginConf: PluginConfig) => {
    const plugin = new Plugin(pluginConf);

    this.plugins[plugin.pluginId] = plugin;
  };

  runHookSeries = (name: string, asynchronous = false) =>
    asynchronous ? this.hooksDict[name].runSeriesAsync() : this.hooksDict[name].runSeries();

  runHookWaterfall = <T,>(name: string, initialValue: T, asynchronous = false, store?: Store) => {
    return asynchronous
      ? this.hooksDict[name].runWaterfallAsync(initialValue, store)
      : this.hooksDict[name].runWaterfall(initialValue, store);
  };

  runHookParallel = (name: string) => this.hooksDict[name].runParallel();

  render() {
    const localeNames = pick(languageNativeNames, this.configurations.locales || []);
    const locale = (localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY) ||
      'en') as keyof typeof localeNames;

    const store = this.createStore({
      admin_app: {
        permissions: {},
        theme: {
          availableThemes: [],
          currentTheme: (localStorage.getItem(THEME_LOCAL_STORAGE_KEY) || 'system') as ThemeName,
        },
        language: {
          locale: localeNames[locale] ? locale : 'en',
          localeNames,
        },
      },
    });

    const {
      components: { components },
      fields: { fields },
    } = this.library;

    return (
      <BrowserRouter basename={getBasename()}>
        <Providers
          components={components}
          fields={fields}
          customFields={this.customFields}
          localeNames={localeNames}
          getAdminInjectedComponents={this.getAdminInjectedComponents}
          // @ts-expect-error - TS doesn't like the fact that this can be null
          getPlugin={this.getPlugin}
          messages={this.configurations.translations}
          menu={this.menu}
          // @ts-expect-error - 'string' index signatures are incompatible
          plugins={this.plugins}
          runHookParallel={this.runHookParallel}
          runHookWaterfall={(name, initialValue, async = false) => {
            return this.runHookWaterfall(name, initialValue, async, store);
          }}
          // @ts-expect-error – context issue. TODO: fix this.
          runHookSeries={this.runHookSeries}
          themes={this.configurations.themes}
          settings={this.settings}
          store={store}
        >
          <Helmet
            htmlAttributes={{ lang: localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY) || 'en' }}
          />
          <App
            authLogo={this.configurations.authLogo}
            menuLogo={this.configurations.menuLogo}
            showTutorials={this.configurations.tutorials}
            showReleaseNotification={this.configurations.notifications.releases}
          />
        </Providers>
      </BrowserRouter>
    );
  }
}

export { StrapiApp, StrapiAppConstructorArgs };
