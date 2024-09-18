import * as React from 'react';

import { darkTheme, lightTheme } from '@strapi/design-system';
import invariant from 'invariant';
import isFunction from 'lodash/isFunction';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import { RouterProvider } from 'react-router-dom';
import { DefaultTheme } from 'styled-components';

import { ADMIN_PERMISSIONS_EE } from '../../ee/admin/src/constants';

import Logo from './assets/images/logo-strapi-2022.svg';
import { ADMIN_PERMISSIONS_CE, HOOKS } from './constants';
import { CustomFields } from './core/apis/CustomFields';
import { Plugin, PluginConfig } from './core/apis/Plugin';
import { RBAC, RBACMiddleware } from './core/apis/rbac';
import { Router, StrapiAppSetting, UnloadedSettingsLink } from './core/apis/router';
import { RootState, Store, configureStore } from './core/store/configure';
import { getBasename } from './core/utils/basename';
import { Handler, createHook } from './core/utils/createHook';
import {
  THEME_LOCAL_STORAGE_KEY,
  LANGUAGE_LOCAL_STORAGE_KEY,
  ThemeName,
  getStoredToken,
} from './reducer';
import { getInitialRoutes } from './router';
import { languageNativeNames } from './translations/languageNativeNames';

import type { ReducersMapObject, Middleware } from '@reduxjs/toolkit';

const {
  INJECT_COLUMN_IN_TABLE,
  MUTATE_COLLECTION_TYPES_LINKS,
  MUTATE_EDIT_VIEW_LAYOUT,
  MUTATE_SINGLE_TYPES_LINKS,
} = HOOKS;

interface StrapiAppConstructorArgs extends Partial<Pick<StrapiApp, 'appPlugins'>> {
  config?: {
    auth?: { logo: string };
    head?: { favicon: string };
    locales?: string[];
    menu?: { logo: string };
    notifications?: { releases: boolean };
    theme?: { light: DefaultTheme; dark: DefaultTheme };
    translations?: Record<string, Record<string, string>>;
    tutorials?: boolean;
  };
}

type Translation = { data: Record<string, string>; locale: string };
type Translations = Array<Translation>;

interface StrapiAppPlugin {
  bootstrap?: (
    args: Pick<StrapiApp, 'addSettingsLink' | 'addSettingsLinks' | 'getPlugin' | 'registerHook'>
  ) => void;
  register: (app: StrapiApp) => void;
  registerTrads?: (args: { locales: string[] }) => Promise<Translations>;
}

interface InjectionZoneComponent {
  Component: React.ComponentType;
  name: string;
  // TODO: in theory this could receive and forward any React component prop
  // but in practice there only seems to be once instance, where `slug` is
  // forwarded. The type needs to become either more generic or we disallow
  // prop spreading and offer a different way to access context data.
  slug: string;
}

interface Component {
  name: string;
  Component: React.ComponentType;
}

interface Field {
  type: string;
  Component: React.ComponentType;
}

interface Library {
  fields: Record<Field['type'], Field['Component']>;
  components: Record<Component['name'], Component['Component']>;
}

class StrapiApp {
  appPlugins: Record<string, StrapiAppPlugin>;
  plugins: Record<string, Plugin> = {};
  hooksDict: Record<string, ReturnType<typeof createHook>> = {};

  admin = {
    injectionZones: {},
  };

  translations: StrapiApp['configurations']['translations'] = {};

  configurations = {
    authLogo: Logo,
    head: { favicon: '' },
    locales: ['en'],
    menuLogo: Logo,
    notifications: { releases: true },
    themes: { light: lightTheme, dark: darkTheme },
    translations: {},
    tutorials: true,
  };

  /**
   * APIs
   */
  rbac = new RBAC();
  router: Router;
  library: Library = {
    components: {},
    fields: {},
  };
  middlewares: Array<() => Middleware<object, RootState>> = [];
  reducers: ReducersMapObject = {};
  store: Store | null = null;
  customFields = new CustomFields();

  constructor({ config, appPlugins }: StrapiAppConstructorArgs = {}) {
    this.appPlugins = appPlugins || {};

    this.createCustomConfigurations(config ?? {});

    this.createHook(INJECT_COLUMN_IN_TABLE);
    this.createHook(MUTATE_COLLECTION_TYPES_LINKS);
    this.createHook(MUTATE_SINGLE_TYPES_LINKS);
    this.createHook(MUTATE_EDIT_VIEW_LAYOUT);

    this.router = new Router(getInitialRoutes());
  }

  addComponents = (components: Component | Component[]) => {
    if (Array.isArray(components)) {
      components.map((comp) => {
        invariant(comp.Component, 'A Component must be provided');
        invariant(comp.name, 'A type must be provided');

        this.library.components[comp.name] = comp.Component;
      });
    } else {
      invariant(components.Component, 'A Component must be provided');
      invariant(components.name, 'A type must be provided');

      this.library.components[components.name] = components.Component;
    }
  };

  addFields = (fields: Field | Field[]) => {
    if (Array.isArray(fields)) {
      fields.map((field) => {
        invariant(field.Component, 'A Component must be provided');
        invariant(field.type, 'A type must be provided');

        this.library.fields[field.type] = field.Component;
      });
    } else {
      invariant(fields.Component, 'A Component must be provided');
      invariant(fields.type, 'A type must be provided');

      this.library.fields[fields.type] = fields.Component;
    }
  };

  addMiddlewares = (middlewares: StrapiApp['middlewares']) => {
    middlewares.forEach((middleware) => {
      this.middlewares.push(middleware);
    });
  };

  addRBACMiddleware = (m: RBACMiddleware | RBACMiddleware[]) => {
    if (Array.isArray(m)) {
      this.rbac.use(m);
    } else {
      this.rbac.use(m);
    }
  };

  addReducers = (reducers: ReducersMapObject) => {
    /**
     * TODO: when we upgrade to redux-toolkit@2 and we can also dynamically add middleware,
     * we'll deprecate these two APIs in favour of their hook counterparts.
     */
    Object.entries(reducers).forEach(([name, reducer]) => {
      this.reducers[name] = reducer;
    });
  };

  addMenuLink = (link: Parameters<typeof this.router.addMenuLink>[0]) =>
    this.router.addMenuLink(link);

  /**
   * @deprecated use `addSettingsLink` instead, it internally supports
   * adding multiple links at once.
   */
  addSettingsLinks = (sectionId: string, links: UnloadedSettingsLink[]) => {
    invariant(Array.isArray(links), 'TypeError expected links to be an array');

    this.router.addSettingsLink(sectionId, links);
  };

  /**
   * @deprecated use `addSettingsLink` instead, you can pass a section object to
   * create the section and links at the same time.
   */
  createSettingSection = (
    section: Pick<StrapiAppSetting, 'id' | 'intlLabel'>,
    links: UnloadedSettingsLink[]
  ) => this.router.addSettingsLink(section, links);

  addSettingsLink = (
    sectionId: string | Pick<StrapiAppSetting, 'id' | 'intlLabel'>,
    link: UnloadedSettingsLink
  ) => {
    this.router.addSettingsLink(sectionId, link);
  };

  async bootstrap(customBootstrap?: unknown) {
    Object.keys(this.appPlugins).forEach((plugin) => {
      const bootstrap = this.appPlugins[plugin].bootstrap;

      if (bootstrap) {
        bootstrap({
          addSettingsLink: this.addSettingsLink,
          addSettingsLinks: this.addSettingsLinks,
          getPlugin: this.getPlugin,
          registerHook: this.registerHook,
        });
      }
    });

    if (isFunction(customBootstrap)) {
      customBootstrap({
        addComponents: this.addComponents,
        addFields: this.addFields,
        addMenuLink: this.addMenuLink,
        addReducers: this.addReducers,
        addSettingsLink: this.addSettingsLink,
        addSettingsLinks: this.addSettingsLinks,
        getPlugin: this.getPlugin,
        registerHook: this.registerHook,
      });
    }
  }

  createCustomConfigurations = (customConfig: NonNullable<StrapiAppConstructorArgs['config']>) => {
    if (customConfig.locales) {
      this.configurations.locales = [
        'en',
        ...(customConfig.locales?.filter((loc) => loc !== 'en') || []),
      ];
    }

    if (customConfig.auth?.logo) {
      this.configurations.authLogo = customConfig.auth.logo;
    }

    if (customConfig.menu?.logo) {
      this.configurations.menuLogo = customConfig.menu.logo;
    }

    if (customConfig.head?.favicon) {
      this.configurations.head.favicon = customConfig.head.favicon;
    }

    if (customConfig.theme) {
      const darkTheme = customConfig.theme.dark;
      const lightTheme = customConfig.theme.light;

      if (!darkTheme && !lightTheme) {
        console.warn(
          `[deprecated] In future versions, Strapi will stop supporting this theme customization syntax. The theme configuration accepts a light and a dark key to customize each theme separately. See https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#theme-extension.`.trim()
        );
        merge(this.configurations.themes.light, customConfig.theme);
      }

      if (lightTheme) merge(this.configurations.themes.light, lightTheme);

      if (darkTheme) merge(this.configurations.themes.dark, darkTheme);
    }

    if (customConfig.notifications?.releases !== undefined) {
      this.configurations.notifications.releases = customConfig.notifications.releases;
    }

    if (customConfig.tutorials !== undefined) {
      this.configurations.tutorials = customConfig.tutorials;
    }
  };

  createHook = (name: string) => {
    this.hooksDict[name] = createHook();
  };

  getAdminInjectedComponents = (
    moduleName: string,
    containerName: string,
    blockName: string
  ): InjectionZoneComponent[] => {
    try {
      // @ts-expect-error – we have a catch block so if you don't pass it correctly we still return an array.
      return this.admin.injectionZones[moduleName][containerName][blockName] || [];
    } catch (err) {
      console.error('Cannot get injected component', err);

      return [];
    }
  };

  getPlugin = (pluginId: PluginConfig['id']) => this.plugins[pluginId];

  async register(customRegister?: unknown) {
    Object.keys(this.appPlugins).forEach((plugin) => {
      this.appPlugins[plugin].register(this);
    });

    if (isFunction(customRegister)) {
      customRegister(this);
    }
  }

  async loadAdminTrads() {
    const adminLocales = await Promise.all(
      this.configurations.locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return { data, locale };
        } catch {
          return { data: null, locale };
        }
      })
    );

    return adminLocales.reduce<{ [locale: string]: Record<string, string> }>((acc, current) => {
      if (current.data) {
        acc[current.locale] = current.data;
      }

      return acc;
    }, {});
  }

  /**
   * Load the application's translations and merged the custom translations
   * with the default ones.
   */
  async loadTrads(customTranslations: Record<string, Record<string, string>> = {}) {
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
        ...(customTranslations[current] ?? {}),
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

  runHookWaterfall = <T,>(name: string, initialValue: T, store?: Store) => {
    return this.hooksDict[name].runWaterfall(initialValue, store);
  };

  runHookParallel = (name: string) => this.hooksDict[name].runParallel();

  render() {
    const localeNames = pick(languageNativeNames, this.configurations.locales || []);
    const locale = (localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY) ||
      'en') as keyof typeof localeNames;

    this.store = configureStore(
      {
        admin_app: {
          permissions: merge({}, ADMIN_PERMISSIONS_CE, ADMIN_PERMISSIONS_EE),
          theme: {
            availableThemes: [],
            currentTheme: (localStorage.getItem(THEME_LOCAL_STORAGE_KEY) || 'system') as ThemeName,
          },
          language: {
            locale: localeNames[locale] ? locale : 'en',
            localeNames,
          },
          token: getStoredToken(),
        },
      },
      this.middlewares,
      this.reducers
    ) as Store;

    const router = this.router.createRouter(this, {
      basename: getBasename(),
    });

    return <RouterProvider router={router} />;
  }
}

export { StrapiApp };
export type { StrapiAppPlugin, StrapiAppConstructorArgs, InjectionZoneComponent };
