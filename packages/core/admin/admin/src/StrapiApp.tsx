import * as React from 'react';

import { ReducersMapObject } from '@reduxjs/toolkit';
import { darkTheme, lightTheme } from '@strapi/design-system';
import {
  LoadingIndicatorPage,
  MenuItem,
  StrapiAppSetting,
  StrapiAppSettingLink,
} from '@strapi/helper-plugin';
import invariant from 'invariant';
import isFunction from 'lodash/isFunction';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import { Helmet } from 'react-helmet';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { DefaultTheme } from 'styled-components';

import { getEERoutes as getBaseEERoutes } from '../../ee/admin/src/constants';
import { getEERoutes as getSettingsEERoutes } from '../../ee/admin/src/pages/SettingsPage/constants';

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
import { routes as cmRoutes } from './content-manager/routes';
import { Components, Component } from './core/apis/Components';
import { CustomFields } from './core/apis/CustomFields';
import { Field, Fields } from './core/apis/Fields';
import { Middleware, Middlewares } from './core/apis/Middlewares';
import { Plugin, PluginConfig } from './core/apis/Plugin';
import { Reducers } from './core/apis/Reducers';
import { PreloadState, Store, configureStore } from './core/store/configure';
import { getBasename } from './core/utils/basename';
import { Handler, createHook } from './core/utils/createHook';
import { AuthPage } from './pages/Auth/AuthPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ROUTES_CE } from './pages/Settings/constants';
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

interface UnloadedSettingsLink extends Omit<StrapiAppSettingLink, 'Component'> {
  Component: () => Promise<{ default: React.ComponentType }>;
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
  }

  addComponents = (components: Component | Component[]) => {
    if (Array.isArray(components)) {
      components.map((compo) => this.library.components.add(compo));
    } else {
      this.library.components.add(components);
    }
  };

  addFields = (fields: Field | Field[]) => {
    if (Array.isArray(fields)) {
      fields.map((field) => this.library.fields.add(field));
    } else {
      this.library.fields.add(fields);
    }
  };

  addMenuLink = (
    link: Omit<MenuItem, 'Component'> & {
      Component: () => Promise<{ default: React.ComponentType }>;
    }
  ) => {
    invariant(link.to, `[${link.intlLabel.defaultMessage}]: link.to should be defined`);
    invariant(
      typeof link.to === 'string',
      `[${
        link.intlLabel.defaultMessage
      }]: Expected link.to to be a string instead received ${typeof link.to}`
    );
    invariant(
      link.intlLabel?.id && link.intlLabel?.defaultMessage,
      `[${link.intlLabel.defaultMessage}]: link.intlLabel.id & link.intlLabel.defaultMessage should be defined`
    );
    invariant(
      link.Component && typeof link.Component === 'function',
      `[${link.intlLabel.defaultMessage}]: link.Component must be a function returning a Promise that returns a default component. Please use: \`Component: () => import(path)\` instead.`
    );
    invariant(
      link.icon && typeof link.icon === 'function',
      `[${link.intlLabel.defaultMessage}]: link.Icon should be a valid React Component`
    );

    if (
      link.Component &&
      typeof link.Component === 'function' &&
      // @ts-expect-error – shh
      link.Component[Symbol.toStringTag] === 'AsyncFunction'
    ) {
      console.warn(`
      [${link.intlLabel.defaultMessage}]: [deprecated] addMenuLink() was called with an async Component from the plugin "${link.intlLabel.defaultMessage}". This will be removed
        in the future. Please use: \`Component: () => import(path)\` ensuring you return a default export instead.
      `);
    }

    if (link.to.startsWith('/')) {
      console.warn(
        `[${link.intlLabel.defaultMessage}]: the \`to\` property of your menu link is an absolute path, it should be relative to the root of the application. This has been corrected for you but will be removed in a future version of Strapi.`
      );

      link.to = link.to.slice(1);
    }

    this.menu.push({
      ...link,
      Component: React.lazy(async () => {
        const mod = await link.Component();

        if ('default' in mod) {
          return mod;
        } else {
          return { default: mod };
        }
      }),
    });
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

  addSettingsLink = (sectionId: keyof StrapiApp['settings'], link: UnloadedSettingsLink) => {
    invariant(this.settings[sectionId], 'The section does not exist');

    invariant(link.id, `[${link.intlLabel.defaultMessage}]: link.id should be defined`);
    invariant(
      link.intlLabel?.id && link.intlLabel?.defaultMessage,
      `[${link.intlLabel.defaultMessage}]: link.intlLabel.id & link.intlLabel.defaultMessage`
    );
    invariant(link.to, `[${link.intlLabel.defaultMessage}]: link.to should be defined`);
    invariant(
      link.Component && typeof link.Component === 'function',
      `[${link.intlLabel.defaultMessage}]: link.Component must be a function returning a Promise. Please use: \`Component: () => import(path)\` instead.`
    );

    if (
      link.Component &&
      typeof link.Component === 'function' &&
      // @ts-expect-error – shh
      link.Component[Symbol.toStringTag] === 'AsyncFunction'
    ) {
      console.warn(`
      [${link.intlLabel.defaultMessage}]: [deprecated] addSettingsLink() was called with an async Component from the plugin "${link.intlLabel.defaultMessage}". This will be removed
        in the future. Please use: \`Component: () => import(path)\` ensuring you return a default export instead.
      `);
    }

    if (link.to.startsWith('/')) {
      console.warn(
        `[${link.intlLabel.defaultMessage}]: the \`to\` property of your settings link is an absolute path. It should be relative to \`/settings\`. This has been corrected for you but will be removed in a future version of Strapi.`
      );

      link.to = link.to.slice(1);
    }

    if (link.to.split('/')[0] === 'settings') {
      console.warn(
        `[${link.intlLabel.defaultMessage}]: the \`to\` property of your settings link has \`settings\` as the first part of it's path. It should be relative to \`settings\` and therefore, not include it. This has been corrected for you but will be removed in a future version of Strapi.`
      );

      link.to = link.to.split('/').slice(1).join('/');
    }

    this.settings[sectionId].links.push({
      ...link,
      Component: React.lazy(async () => {
        const mod = await link.Component();

        if ('default' in mod) {
          return mod;
        } else {
          return { default: mod };
        }
      }),
    });
  };

  addSettingsLinks = (
    sectionId: Parameters<typeof this.addSettingsLink>[0],
    links: UnloadedSettingsLink[]
  ) => {
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

  createSettingSection = (section: StrapiAppSetting, links: UnloadedSettingsLink[]) => {
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

    const settingsRoutes = [...getSettingsEERoutes(), ...ROUTES_CE].filter(
      (route, index, refArray) => refArray.findIndex((obj) => obj.path === route.path) === index
    );

    const router = createBrowserRouter(
      [
        {
          path: '/*',
          element: <Root strapi={this} localeNames={localeNames} store={store} />,
          children: [
            {
              path: 'usecase',
              lazy: async () => {
                const { PrivateUseCasePage } = await import('./pages/UseCasePage');

                return {
                  Component: PrivateUseCasePage,
                };
              },
            },
            {
              path: 'auth/:authType',
              element: <AuthPage />,
            },
            {
              path: '/*',
              lazy: async () => {
                const { PrivateAdminLayout } = await import('./pages/Layout');

                return {
                  Component: PrivateAdminLayout,
                };
              },
              children: [
                {
                  index: true,
                  lazy: async () => {
                    const { HomePage } = await import('./pages/HomePage');

                    return {
                      Component: HomePage,
                    };
                  },
                },
                {
                  path: 'me',
                  lazy: async () => {
                    const { ProfilePage } = await import('./pages/ProfilePage');

                    return {
                      Component: ProfilePage,
                    };
                  },
                },
                {
                  path: 'list-plugins',
                  lazy: async () => {
                    const { ProtectedInstalledPluginsPage } = await import(
                      './pages/InstalledPluginsPage'
                    );

                    return {
                      Component: ProtectedInstalledPluginsPage,
                    };
                  },
                },
                {
                  path: 'marketplace',
                  lazy: async () => {
                    const { ProtectedMarketplacePage } = await import(
                      './pages/Marketplace/MarketplacePage'
                    );

                    return {
                      Component: ProtectedMarketplacePage,
                    };
                  },
                },
                {
                  path: 'settings/*',
                  lazy: async () => {
                    const { Layout } = await import('./pages/Settings/Layout');

                    return {
                      Component: Layout,
                    };
                  },
                  children: [
                    {
                      path: 'application-infos',
                      lazy: async () => {
                        const { ApplicationInfoPage } = await import(
                          './pages/Settings/pages/ApplicationInfo/ApplicationInfoPage'
                        );

                        return {
                          Component: ApplicationInfoPage,
                        };
                      },
                    },
                    ...Object.values(this.settings).flatMap(({ links }) =>
                      links.map(({ to, Component }) => ({
                        path: `${to}/*`,
                        element: (
                          <React.Suspense fallback={<LoadingIndicatorPage />}>
                            <Component />
                          </React.Suspense>
                        ),
                      }))
                    ),
                    ...settingsRoutes,
                  ],
                },
                ...this.menu.map(({ to, Component }) => ({
                  path: `${to}/*`,
                  element: (
                    <React.Suspense fallback={<LoadingIndicatorPage />}>
                      <Component />
                    </React.Suspense>
                  ),
                })),
                ...getBaseEERoutes(),
                ...cmRoutes,
              ],
            },
            {
              path: '*',
              element: <NotFoundPage />,
            },
          ],
        },
      ],
      {
        basename: getBasename(),
      }
    );

    return <RouterProvider router={router} />;
  }
}

interface RootProps {
  localeNames: Record<string, string>;
  strapi: StrapiApp;
  store: Store;
}
/**
 * The Root component sets up all the context providers which _do not_
 * require data-fetching to perform their duties i.e. Notifications or
 * CustomFields or the Store.
 */
const Root = ({ strapi, store, localeNames }: RootProps) => {
  return (
    <Providers
      components={strapi.library.components.components}
      fields={strapi.library.fields.fields}
      customFields={strapi.customFields}
      localeNames={localeNames}
      getAdminInjectedComponents={strapi.getAdminInjectedComponents}
      getPlugin={strapi.getPlugin}
      messages={strapi.configurations.translations}
      menu={strapi.menu}
      plugins={strapi.plugins}
      runHookParallel={strapi.runHookParallel}
      runHookWaterfall={(name, initialValue, async = false) => {
        return strapi.runHookWaterfall(name, initialValue, async, store);
      }}
      // @ts-expect-error – context issue. TODO: fix this.
      runHookSeries={strapi.runHookSeries}
      themes={strapi.configurations.themes}
      settings={strapi.settings}
      store={store}
    >
      <Helmet htmlAttributes={{ lang: localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY) || 'en' }} />
      <App
        authLogo={strapi.configurations.authLogo}
        menuLogo={strapi.configurations.menuLogo}
        showTutorials={strapi.configurations.tutorials}
        showReleaseNotification={strapi.configurations.notifications.releases}
      />
    </Providers>
  );
};

export { StrapiApp, StrapiAppConstructorArgs };
