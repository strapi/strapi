import * as React from 'react';

import { darkTheme, lightTheme } from '@strapi/design-system';
import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import invariant from 'invariant';
import merge from 'lodash/merge';
import { Helmet } from 'react-helmet';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import faviconSrc from './assets/favicon.png';
import logoSrc from './assets/images/logo-strapi-2022.svg';
import { PrivateRoute } from './components/PrivateRoute';
import { Providers } from './components/Providers';
import { APP_REDUCERS, INJECTION_ZONES, LANGUAGE_MAP, LOCALE_LOCALSTORAGE_KEY } from './constants';
import { customFields, Plugin } from './core/apis';
import { configureStore } from './core/store/configureStore';
import { createHook } from './core/utils';
import {
  INJECT_COLUMN_IN_TABLE,
  MUTATE_COLLECTION_TYPES_LINKS,
  MUTATE_EDIT_VIEW_LAYOUT,
  MUTATE_SINGLE_TYPES_LINKS,
} from './exposedHooks';
import { App } from './pages/App';

const AuthPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin-AuthPage" */ './pages/AuthPage').then((module) => ({
    default: module.AuthPage,
  }))
);

const AuthenticatedApp = React.lazy(() =>
  import(/* webpackChunkName: "Admin-AuthenticatedApp" */ './components/AuthenticatedApp').then(
    (module) => ({ default: module.AuthenticatedApp })
  )
);

const UseCasePage = React.lazy(() =>
  import(/* webpackChunkName: "Admin-UseCasePage" */ './pages/UseCasePage').then((module) => ({
    default: module.UseCasePage,
  }))
);

const NotFoundPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_NotFoundPage" */ './pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  }))
);

const InternalErrorPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_InternalErrorPage" */ './pages/InternalErrorPage').then(
    (module) => ({ default: module.InternalErrorPage })
  )
);

export class StrapiApp {
  constructor({ configuration, corePlugins = {} } = {}) {
    this.customBootstrap = configuration?.bootstrap;
    this.configuration = {
      // TODO: we should unify the internal and configuration path
      authLogo: configuration?.config?.auth?.logo ?? logoSrc,
      head: { favicon: configuration?.config?.head?.favicon ?? faviconSrc },
      locales: [
        'en',
        ...(configuration?.config?.locales ?? []).filter((locale) => locale !== 'en'),
      ],
      // TODO: we should unify the internal and configuration path
      menuLogo: configuration?.config?.menu?.logo ?? logoSrc,
      notifications: { releases: configuration?.config?.notifications?.releases ?? true },
      themes: {
        light: lightTheme,
        dark: darkTheme,
      },
      translations: configuration?.config?.translations ?? {},
      tutorials: configuration?.config?.tutorials ?? true,
    };

    // legacy way of overwriting themes
    if (
      configuration?.config?.theme &&
      !configuration.config.theme?.dark &&
      !configuration.config.theme?.light
    ) {
      console.warn(
        `[deprecated] In future versions, Strapi will stop supporting this theme customization syntax. The theme configuration accepts a light and a dark key to customize each theme separately. See https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#theme-extension.`
      );

      merge(this.configuration.themes.light, configuration.theme);
    } else {
      merge(this.configuration.themes.light, configuration?.config.theme?.light ?? {});
      merge(this.configuration.themes.dark, configuration?.config?.theme?.dark ?? {});
    }

    this.corePlugins = corePlugins;
    this.plugins = {};
    this.components = {};
    this.fields = {};
    this.middlewares = [];
    this.reducers = APP_REDUCERS;
    this.translations = {};
    this.hooksDict = {};
    this.injectionZones = INJECTION_ZONES;
    this.customFields = customFields;
    this.menu = [];
    this.routes = [
      {
        path: '/usecase',
        render: (props) => <PrivateRoute component={AuthenticatedApp} {...props} />,
      },

      {
        path: '/usecase',
        render: (props) => <PrivateRoute component={UseCasePage} {...props} />,
      },

      {
        path: '/auth/:authType',
        render: (props) => <AuthPage {...props} />,
        exact: true,
      },

      window.isEE
        ? {
            path: '/auth/login/:authResponse',
            component: React.lazy(() =>
              import('../../ee/admin/pages/AuthResponse').then((module) => ({
                default: module.AuthResponse,
              }))
            ),
          }
        : {},
      {
        path: '/404',
        component: NotFoundPage,
      },

      {
        path: '/500',
        component: InternalErrorPage,
      },

      {
        path: '',
        component: NotFoundPage,
      },
    ];
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

  addComponents = (defaultComponents) => {
    let components = defaultComponents;

    if (!Array.isArray(components)) {
      components = [defaultComponents];
    }

    components.forEach((component) => {
      const { name, Component } = component;

      invariant(Component, 'A Component must be provided');
      invariant(name, 'A name must be provided');
      invariant(this.components[name] === undefined, 'A similar field already exists');

      this.components[name] = Component;
    });
  };

  addFields = (defaultFields) => {
    let fields = defaultFields;

    if (!Array.isArray(fields)) {
      fields = [fields];
    }

    fields.forEach((field) => {
      const { type, Component } = field;

      invariant(Component, 'A Component must be provided');
      invariant(type, 'A type must be provided');

      this.fields[type] = Component;
    });
  };

  addMenuLink = (link) => {
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
      `link.Component must be a function returning a Promise. Please use: \`Component: () => import(path)\` instead.`
    );
    invariant(
      link.icon && typeof link.icon === 'function',
      `link.Icon should be a valid React Component`
    );

    if (
      link.Component &&
      typeof link.Component === 'function' &&
      link.Component[Symbol.toStringTag] === 'AsyncFunction'
    ) {
      console.warn(`
        [deprecated] addMenuLink() was called with an async Component from the plugin "${link.intlLabel.Internationalization}". This will be removed
        in the future. Please use: \`Component: () => import(path)\` instead.
      `);
    }

    this.menu.push({
      ...link,

      // React.lazy can be removed once we migrate to react-router@6, because the <Route /> component can handle it natively
      Component: React.lazy(link.Component),
    });
  };

  addMiddlewares = (middlewares) => {
    middlewares.forEach((middleware) => {
      this.middlewares.push(middleware);
    });
  };

  addReducers = (reducers) => {
    Object.entries(reducers).forEach(([name, reducerFn]) => {
      this.reducers[name] = reducerFn;
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
      `link.Component must be a function returning a Promise. Please use: \`Component: () => import(path)\` instead.`
    );

    if (
      link.Component &&
      typeof link.Component === 'function' &&
      link.Component[Symbol.toStringTag] === 'AsyncFunction'
    ) {
      console.warn(`
        [deprecated] addSettingsLink() was called with an async Component from the plugin: "${link.intlLabel.Internationalization}". This will be removed
        in the future. Please use: \`Component: () => import(path)\` instead.
      `);
    }

    this.settings[sectionId].links.push({
      ...link,

      // React.lazy can be removed once we migrate to react-router@6, because the <Route /> component can handle it natively
      Component: React.lazy(link.Component),
    });
  };

  addSettingsLinks = (sectionId, links) => {
    invariant(this.settings[sectionId], 'The section does not exist');
    invariant(Array.isArray(links), 'TypeError expected links to be an array');

    links.forEach((link) => {
      this.addSettingsLink(sectionId, link);
    });
  };

  bootstrap() {
    // Call bootstrap callback of each core plugin
    Object.values(this.corePlugins).forEach((plugin) => {
      if (plugin.bootstrap) {
        plugin.bootstrap({
          addSettingsLink: this.addSettingsLink,
          addSettingsLinks: this.addSettingsLinks,
          getPlugin: this.getPlugin,
          injectContentManagerComponent: this.injectContentManagerComponent,
          injectAdminComponent: this.injectAdminComponent,
          registerHook: this.registerHook,
        });
      }
    });

    // Call a custom bootstrap function that might be defined
    // as part of an admin panel customization.
    // See https://docs.strapi.io/dev-docs/admin-panel-customization
    if (typeof this.customBootstrap === 'function') {
      this.customBootstrap({
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

  createHook = (name) => {
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

    links.forEach((link) => {
      this.addSettingsLink(section.id, link);
    });
  };

  getAdminInjectedComponents = (moduleName, containerName, blockName) => {
    try {
      return this.injectionZones[moduleName][containerName][blockName] || [];
    } catch (err) {
      console.error('Cannot get injected component', err);

      return err;
    }
  };

  getPlugin = (pluginId) => {
    return this.plugins[pluginId];
  };

  register() {
    this.createHook(INJECT_COLUMN_IN_TABLE);
    this.createHook(MUTATE_COLLECTION_TYPES_LINKS);
    this.createHook(MUTATE_SINGLE_TYPES_LINKS);
    this.createHook(MUTATE_EDIT_VIEW_LAYOUT);

    // Call `.register()` callback of each plugin
    Object.values(this.corePlugins).forEach((plugin) => {
      if (plugin.register) {
        // TODO: we should limit what methods from StrapiApp are available
        // in .register() like we do for .bootstrap() instead of exposing the
        // whole instance. If we feel adventurous we could do that in v4 - if
        // not v5 is a good moment to clean this up.
        plugin.register(this);
      }
    });
  }

  injectContentManagerComponent = (containerName, blockName, component) => {
    invariant(
      this.injectionZones.contentManager[containerName]?.[blockName],
      `The ${containerName} ${blockName} zone is not defined in the content manager`
    );
    invariant(component, 'A Component must be provided');

    this.injectionZones.contentManager[containerName][blockName].push(component);
  };

  injectAdminComponent = (containerName, blockName, component) => {
    invariant(
      this.injectionZones.admin[containerName]?.[blockName],
      `The ${containerName} ${blockName} zone is not defined in the admin`
    );
    invariant(component, 'A Component must be provided');

    this.injectionZones.admin[containerName][blockName].push(component);
  };

  /**
   * Load the admin translations
   * @returns {Object} The imported admin translations
   */
  async loadAdminTranslations() {
    const translations = (
      await Promise.all(
        this.configuration.locales.map((locale) =>
          import(/* webpackChunkName: "[request]" */ `./translations/${locale}.json`).then(
            ({ default: data }) => ({ data, locale })
          )
        )
      )
    ).reduce((acc, current) => {
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
    const adminTranslations = await this.loadAdminTranslations();
    const pluginTranslations = (await Promise.all(Object.entries(this.plugins)))
      .map((plugin) =>
        plugin.registerTrads ? plugin.registerTrads({ locales: this.configuration.locales }) : null
      )
      .filter(Boolean);

    const mergedTranslations = pluginTranslations.reduce((acc, translations) => {
      const pluginTrads = translations.reduce((acc1, current) => {
        acc1[current.locale] = current.data;

        return acc1;
      }, {});

      Object.keys(pluginTrads).forEach((locale) => {
        acc[locale] = { ...acc[locale], ...pluginTrads[locale] };
      });

      return acc;
    }, {});

    this.configuration.translations = this.configuration.locales.reduce((acc, current) => {
      acc[current] = {
        ...adminTranslations[current],
        ...(mergedTranslations[current] || {}),
        ...this.config?.translations?.[current],
      };

      return acc;
    }, {});

    return null;
  }

  registerHook = (name, fn) => {
    invariant(
      this.hooksDict[name],
      `The hook ${name} is not defined. You are trying to register a hook that does not exist in the application.`
    );
    this.hooksDict[name].register(fn);
  };

  registerPlugin = (pluginConf) => {
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

  runHookParallel = (name) => this.hooksDict[name].runParallel();

  render() {
    const store = configureStore(this.middlewares, this.reducers);

    return (
      <Providers
        authLogo={this.configuration.authLogo}
        components={this.components}
        fields={this.fields}
        customFields={this.customFields}
        localeNames={(this.configuration.locales ?? []).reduce((acc, locale) => {
          if (LANGUAGE_MAP[locale]) {
            acc[locale] = LANGUAGE_MAP[locale];
          }

          return acc;
        }, {})}
        getAdminInjectedComponents={this.getAdminInjectedComponents}
        getPlugin={this.getPlugin}
        messages={this.configuration.translations}
        menu={this.menu}
        menuLogo={this.configuration.menuLogo}
        plugins={this.plugins}
        runHookParallel={this.runHookParallel}
        runHookWaterfall={(name, initialValue, async = false) => {
          return this.runHookWaterfall(name, initialValue, async, store);
        }}
        runHookSeries={this.runHookSeries}
        themes={this.configuration.themes}
        settings={this.settings}
        showTutorials={this.configuration.tutorials}
        showReleaseNotification={this.configuration.notifications.releases}
        store={store}
      >
        <>
          <Helmet
            link={[
              {
                rel: 'icon',
                type: 'image/png',
                href: this.configuration.head.favicon,
              },
            ]}
            htmlAttributes={{ lang: localStorage.getItem(LOCALE_LOCALSTORAGE_KEY) || 'en' }}
          />

          <React.Suspense fallback={<LoadingIndicatorPage />}>
            <App>
              <BrowserRouter basename={process.env.ADMIN_PATH.replace(window.location.origin, '')}>
                <Switch>
                  {this.routes.map((route) => (
                    <Route key={route.path} {...route} />
                  ))}
                </Switch>
              </BrowserRouter>
            </App>
          </React.Suspense>
        </>
      </Providers>
    );
  }
}
