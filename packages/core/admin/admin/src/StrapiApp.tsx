import * as React from 'react';

import { darkTheme, lightTheme } from '@strapi/design-system';
import invariant from 'invariant';
import isFunction from 'lodash/isFunction';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import { Provider } from 'react-redux';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { DefaultTheme } from 'styled-components';

import { ADMIN_PERMISSIONS_EE, getEERoutes as getBaseEERoutes } from '../../ee/admin/src/constants';
import { getEERoutes as getSettingsEERoutes } from '../../ee/admin/src/pages/SettingsPage/constants';

import { App } from './App';
import Logo from './assets/images/logo-strapi-2022.svg';
import { ErrorElement } from './components/ErrorElement';
import {
  INJECTION_ZONES,
  InjectionZoneBlock,
  InjectionZoneComponent,
  InjectionZoneContainer,
  InjectionZoneModule,
  InjectionZones,
} from './components/InjectionZone';
import { LanguageProvider } from './components/LanguageProvider';
import { Page } from './components/PageHelpers';
import { Theme } from './components/Theme';
import { ADMIN_PERMISSIONS_CE, HOOKS } from './constants';
import { routes as cmRoutes } from './content-manager/router';
import { ContentManagerPlugin } from './core/apis/content-manager';
import { CustomFields } from './core/apis/CustomFields';
import { Plugin, PluginConfig } from './core/apis/Plugin';
import { RootState, Store, configureStore } from './core/store/configure';
import { getBasename } from './core/utils/basename';
import { Handler, createHook } from './core/utils/createHook';
import { AuthPage } from './pages/Auth/AuthPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ROUTES_CE } from './pages/Settings/constants';
import { THEME_LOCAL_STORAGE_KEY, LANGUAGE_LOCAL_STORAGE_KEY, ThemeName } from './reducer';
import { languageNativeNames } from './translations/languageNativeNames';

import type { Permission } from './features/Auth';
import type { ReducersMapObject, Middleware } from '@reduxjs/toolkit';
import type { MessageDescriptor, PrimitiveType } from 'react-intl';

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

interface MenuItem {
  to: string;
  icon: React.ElementType;
  intlLabel: MessageDescriptor & { values?: Record<string, PrimitiveType> };
  permissions: Permission[];
  notificationsCount?: number;
  Component: React.LazyExoticComponent<React.ComponentType>;
  exact?: boolean;
  lockIcon?: boolean;
}

interface StrapiAppSettingLink extends Omit<MenuItem, 'icon' | 'notificationCount'> {
  id: string;
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

interface StrapiAppSetting {
  id: string;
  intlLabel: MessageDescriptor & {
    values?: Record<string, PrimitiveType>;
  };
  links: StrapiAppSettingLink[];
}

class StrapiApp {
  appPlugins: Record<string, StrapiAppPlugin>;
  plugins: Record<string, Plugin> = {};
  hooksDict: Record<string, ReturnType<typeof createHook>> = {};

  admin = {
    injectionZones: INJECTION_ZONES,
  };

  translations: StrapiApp['configurations']['translations'] = {};

  /**
   * MENU API
   */
  menu: MenuItem[] = [];
  settings: Record<string, StrapiAppSetting> = {
    global: {
      id: 'global',
      intlLabel: {
        id: 'Settings.global',
        defaultMessage: 'Global Settings',
      },
      links: [],
    },
  };

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
  private contentManager = new ContentManagerPlugin();
  library: Library = {
    components: {},
    fields: {},
  };
  middlewares: Array<() => Middleware<object, RootState>> = [];
  reducers: ReducersMapObject = {};
  customFields = new CustomFields();

  constructor({ config, appPlugins }: StrapiAppConstructorArgs = {}) {
    this.appPlugins = appPlugins || {};

    this.createCustomConfigurations(config ?? {});

    this.registerPlugin(this.contentManager.config);

    this.createHook(INJECT_COLUMN_IN_TABLE);
    this.createHook(MUTATE_COLLECTION_TYPES_LINKS);
    this.createHook(MUTATE_SINGLE_TYPES_LINKS);
    this.createHook(MUTATE_EDIT_VIEW_LAYOUT);
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

  addMiddlewares = (middlewares: StrapiApp['middlewares']) => {
    middlewares.forEach((middleware) => {
      this.middlewares.push(middleware);
    });
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

  async bootstrap(customBootstrap?: unknown) {
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

    if (isFunction(customBootstrap)) {
      customBootstrap({
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
          `[deprecated] In future versions, Strapi will stop supporting this theme customization syntax. The theme configuration accepts a light and a dark key to customize each theme separately. See https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#theme-extension.`
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

  getPlugin = (pluginId: PluginConfig['id']) => this.plugins[pluginId];

  async register() {
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

    if (containerName === 'editView' && blockName === 'right-links') {
      console.warn(
        `Injecting components into editView.right-links is deprecated. Please use the \`addEditViewSidePanel\` API instead.`
      );
    }

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

    const store = configureStore(
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
        },
      },
      this.middlewares,
      this.reducers
    ) as Store;

    const settingsRoutes = [...getSettingsEERoutes(), ...ROUTES_CE].filter(
      (route, index, refArray) => refArray.findIndex((obj) => obj.path === route.path) === index
    );

    const router = createBrowserRouter(
      [
        {
          path: '/*',
          errorElement: (
            <Provider store={store}>
              <LanguageProvider messages={this.configurations.translations}>
                <Theme themes={this.configurations.themes}>
                  <ErrorElement />
                </Theme>
              </LanguageProvider>
            </Provider>
          ),
          element: <App strapi={this} store={store} />,
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
                const { PrivateAdminLayout } = await import('./layouts/AuthenticatedLayout');

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
                          <React.Suspense fallback={<Page.Loading />}>
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
                    <React.Suspense fallback={<Page.Loading />}>
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

export { StrapiApp };
export type {
  StrapiAppPlugin,
  StrapiAppSettingLink,
  StrapiAppSetting,
  MenuItem,
  StrapiAppConstructorArgs,
};
