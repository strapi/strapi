'use strict';

// Dependencies.
// const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');

const loadConfig = require('../load/config');
const findPackagePath = require('../load/package-path');

const PLUGIN_PREFIX = 'strapi-plugin';

module.exports.loadConfigs = async function({ appPath, installedPlugins }) {
  const [config, admin, api, plugins, localPlugins] = await Promise.all([
    loadAppConfig(appPath),
    loadAdminConfig(),
    loadApisConfig(appPath),
    loadPluginsConfig(installedPlugins),
    loadLocalPluginsConfig(appPath),
  ]);

  return {
    config,
    admin,
    api,
    plugins: _.merge(plugins, localPlugins),
  };
};

// Loads an app config folder
const loadAppConfig = appPath => loadConfig(path.resolve(appPath, 'config'));

// Loads the strapi-admin config folder
const loadAdminConfig = async () => ({
  config: await loadConfig(
    path.resolve(findPackagePath('strapi-admin'), 'config')
  ),
});

// Loads every apis config folder
const loadApisConfig = async appPath => {
  let apis = {};
  const apiFolder = path.resolve(appPath, 'api');
  const apiFolders = await fs.readdir(apiFolder);

  for (let apiFolder of apiFolders) {
    const apiConfig = await loadConfig(
      path.resolve(apiFolder, apiFolder, 'config')
    );

    _.set(apis, [apiFolder, 'config'], apiConfig);
  }

  return apis;
};

const loadLocalPluginsConfig = async appPath => {
  let localPlugins = {};
  const pluginsFolder = path.resolve(appPath, 'plugins');
  const pluginsFolders = await fs.readdir(pluginsFolder);

  for (let pluginsFolder of pluginsFolders) {
    const pluginsConfig = await loadConfig(
      path.resolve(pluginsFolder, pluginsFolder, 'config')
    );

    _.set(localPlugins, [pluginsFolder, 'config'], pluginsConfig);
  }

  return localPlugins;
};

// Loads installed plugins config
const loadPluginsConfig = async pluginsNames => {
  let plugins = {};
  for (let plugin of pluginsNames) {
    const pluginConfig = await loadConfig(
      path.resolve(findPackagePath(plugin), 'config')
    );

    _.set(
      plugins,
      [plugin.substring(PLUGIN_PREFIX.length + 1), 'config'],
      pluginConfig
    );
  }

  return plugins;
};

module.exports.app = function() {
  // Retrieve Strapi version.
  this.config.uuid = _.get(this.config.info, 'strapi.uuid', '');
  this.config.info.customs = _.get(this.config.info, 'strapi', {});
  this.config.info.strapi = (
    _.get(this.config, 'info.dependencies.strapi') || ''
  ).replace(/(\^|~)/g, '');
  this.config.info.node = process.versions.node;

  // Set connections.
  this.connections = {};

  // Set current environment config.
  this.config.currentEnvironment =
    this.config.environments[this.config.environment] || {};

  // Set current connections.
  this.config.connections = _.get(
    this.config.currentEnvironment,
    'database.connections',
    {}
  );

  if (_.get(this.config, 'language.enabled')) {
    this.config.language.locales = Object.keys(
      _.get(strapi.config, 'locales', {})
    );
  }

  // Template literal string.
  // this.config = templateConfiguration(this.config);

  // Initialize main router to use it in middlewares.
  this.router = this.koaMiddlewares.routerJoi();

  // Set controllers.
  this.controllers = Object.keys(this.api || []).reduce((acc, key) => {
    for (let index in this.api[key].controllers) {
      if (!this.api[key].controllers[index].identity) {
        this.api[key].controllers[index].identity = _.upperFirst(index);
      }

      acc[index] = this.api[key].controllers[index];
    }

    return acc;
  }, {});

  // Set models.
  this.models = Object.keys(this.api || []).reduce((acc, key) => {
    for (let index in this.api[key].models) {
      if (!this.api[key].models[index].globalId) {
        this.api[key].models[index].globalId = _.upperFirst(_.camelCase(index));
      }

      if (!this.api[key].models[index].connection) {
        this.api[key].models[
          index
        ].connection = this.config.currentEnvironment.database.defaultConnection;
      }

      if (!this.api[key].models[index].collectionName) {
        this.api[key].models[index].collectionName = `${index}`.toLowerCase();
      }

      acc[index] = this.api[key].models[index];
    }
    return acc;
  }, {});

  // Set services.
  this.services = Object.keys(this.api || []).reduce((acc, key) => {
    for (let index in this.api[key].services) {
      acc[index] = this.api[key].services[index];
    }

    return acc;
  }, {});

  // Set routes.
  this.config.routes = Object.keys(this.api || []).reduce((acc, key) => {
    return acc.concat(_.get(this.api[key], 'config.routes') || {});
  }, []);

  // Set admin controllers.
  this.admin.controllers = Object.keys(this.admin.controllers || []).reduce(
    (acc, key) => {
      if (!this.admin.controllers[key].identity) {
        this.admin.controllers[key].identity = key;
      }

      acc[key] = this.admin.controllers[key];

      return acc;
    },
    {}
  );

  // Set admin models.
  this.admin.models = Object.keys(this.admin.models || []).reduce(
    (acc, key) => {
      if (!this.admin.models[key].identity) {
        this.admin.models[key].identity = _.upperFirst(key);
      }

      if (!this.admin.models[key].globalId) {
        this.admin.models[key].globalId = _.upperFirst(
          _.camelCase(`admin-${key}`)
        );
      }

      if (!this.admin.models[key].connection) {
        this.admin.models[
          key
        ].connection = this.config.currentEnvironment.database.defaultConnection;
      }

      acc[key] = this.admin.models[key];

      return acc;
    },
    {}
  );

  this.plugins = Object.keys(this.plugins).reduce((acc, key) => {
    this.plugins[key].controllers = Object.keys(
      this.plugins[key].controllers || []
    ).reduce((sum, index) => {
      if (!this.plugins[key].controllers[index].identity) {
        this.plugins[key].controllers[index].identity = index;
      }

      sum[index] = this.plugins[key].controllers[index];

      return sum;
    }, {});

    this.plugins[key].models = Object.keys(
      this.plugins[key].models || []
    ).reduce((sum, index) => {
      if (!this.plugins[key].models[index].connection) {
        this.plugins[key].models[
          index
        ].connection = this.config.currentEnvironment.database.defaultConnection;
      }

      if (!this.plugins[key].models[index].globalId) {
        this.plugins[key].models[index].globalId = _.upperFirst(
          _.camelCase(`${key}-${index}`)
        );
      }

      if (!this.plugins[key].models[index].collectionName) {
        this.plugins[key].models[
          index
        ].collectionName = `${key}_${index}`.toLowerCase();
      }

      sum[index] = this.plugins[key].models[index];

      return sum;
    }, {});

    acc[key] = this.plugins[key];

    return acc;
  }, {});

  // Define required middlewares categories.
  const middlewareCategories = ['request', 'response', 'security', 'server'];

  // Flatten middlewares configurations.
  const flattenMiddlewaresConfig = middlewareCategories.reduce((acc, index) => {
    const current = _.merge(this.config.currentEnvironment[index], {
      public: _.defaults(this.config.public, {
        enabled: true,
      }),
      favicon: _.defaults(this.config.favicon, {
        enabled: true,
      }),
    });

    if (_.isObject(current)) {
      acc = _.merge(acc, current);
    } else {
      acc[index] = current;
    }

    return acc;
  }, {});

  // These middlewares cannot be disabled.
  _.merge(flattenMiddlewaresConfig, {
    // Necessary middlewares for the core.
    responses: {
      enabled: true,
    },
    router: {
      enabled: true,
    },
    logger: {
      enabled: true,
    },
    boom: {
      enabled: true,
    },
    mask: {
      enabled: true,
    },
    // Necessary middlewares for the administration panel.
    cors: {
      enabled: true,
    },
    xframe: {
      enabled: true,
    },
    xss: {
      enabled: true,
    },
  });

  // Exclude database and custom.
  middlewareCategories.push('database');

  // Flatten hooks configurations.
  const flattenHooksConfig = _.pullAll(
    Object.keys(this.config.currentEnvironment),
    middlewareCategories
  ).reduce((acc, index) => {
    const current = this.config.currentEnvironment[index];

    if (_.isObject(current)) {
      acc = _.merge(acc, {
        [index]: current,
      });
    } else {
      acc[index] = current;
    }

    return acc;
  }, {});

  // Enable hooks and dependencies related to the connections.
  for (let name in this.config.connections) {
    const connection = this.config.connections[name];
    const connector = connection.connector.replace('strapi-hook-', '');

    enableHookNestedDependencies.call(this, connector, flattenHooksConfig);
  }

  // Preset config in alphabetical order.
  this.config.middleware.settings = Object.keys(this.middleware).reduce(
    (acc, current) => {
      // Try to find the settings in the current environment, then in the main configurations.
      const currentSettings = _.merge(
        _.get(_.cloneDeep(this.middleware[current]), ['defaults', current], {}),
        flattenMiddlewaresConfig[current] ||
          this.config.currentEnvironment[current] ||
          this.config[current]
      );
      acc[current] = !_.isObject(currentSettings) ? {} : currentSettings;

      if (!acc[current].hasOwnProperty('enabled')) {
        this.log.warn(
          `(middleware:${current}) wasn't loaded due to missing key \`enabled\` in the configuration`
        );
      }

      // Ensure that enabled key exist by forcing to false.
      _.defaults(acc[current], { enabled: false });

      return acc;
    },
    {}
  );

  this.config.hook.settings = Object.keys(this.hook).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = _.merge(
      _.get(_.cloneDeep(this.hook[current]), ['defaults', current], {}),
      flattenHooksConfig[current] ||
        _.get(this.config.currentEnvironment, ['hook', current]) ||
        _.get(this.config, ['hook', current])
    );

    acc[current] = !_.isObject(currentSettings) ? {} : currentSettings;

    if (!acc[current].hasOwnProperty('enabled')) {
      this.log.warn(
        `(hook:${current}) wasn't loaded due to missing key \`enabled\` in the configuration`
      );
    }

    // Ensure that enabled key exist by forcing to false.
    _.defaults(acc[current], { enabled: false });

    return acc;
  }, {});

  // default settings
  this.config.port =
    _.get(this.config.currentEnvironment, 'server.port') || this.config.port;
  this.config.host =
    _.get(this.config.currentEnvironment, 'server.host') || this.config.host;

  // Admin.
  const url = getURLFromSegments({
    hostname: this.config.host,
    port: this.config.port,
  });
  const adminPath = _.get(
    this.config.currentEnvironment.server,
    'admin.path',
    'admin'
  );
  this.config.admin.devMode = isAdminInDevMode.call(this);
  this.config.admin.url = this.config.admin.devMode
    ? new URL(adminPath, `http://${this.config.host}:4000`).toString()
    : new URL(adminPath, url).toString();

  // proxy settings
  const proxy = _.get(this.config.currentEnvironment, 'server.proxy', {});
  this.config.proxy = proxy;

  // check if proxy is enabled and construct url
  this.config.url = proxy.enabled
    ? getURLFromSegments({
        hostname: proxy.host,
        port: proxy.port,
        ssl: proxy.ssl,
      })
    : url;
};

const enableHookNestedDependencies = function(
  name,
  flattenHooksConfig,
  force = false
) {
  if (!this.hook[name]) {
    this.log.warn(
      `(hook:${name}) \`strapi-hook-${name}\` is missing in your dependencies. Please run \`npm install strapi-hook-${name}\``
    );
  }

  // Couldn't find configurations for this hook.
  if (_.isEmpty(_.get(flattenHooksConfig, name, true))) {
    // Check if database connector is used
    const modelsUsed = Object.keys(
      _.assign(_.clone(this.api) || {}, this.plugins)
    )
      .filter(x =>
        _.isObject(
          _.get(this.api, [x, 'models']) || _.get(this.plugins, [x, 'models'])
        )
      ) // Filter API with models
      .map(
        x =>
          _.get(this.api, [x, 'models']) || _.get(this.plugins, [x, 'models'])
      ) // Keep models
      .filter(models => {
        const apiModelsUsed = Object.keys(models).filter(model => {
          const connector = _.get(
            this.config.connections,
            models[model].connection,
            {}
          ).connector;

          if (connector) {
            return connector.replace('strapi-hook-', '') === name;
          }

          return false;
        });

        return apiModelsUsed.length !== 0;
      }); // Filter model with the right connector

    flattenHooksConfig[name] = {
      enabled: force || modelsUsed.length > 0, // Will return false if there is no model, else true.
    };

    // Enabled dependencies.
    if (_.get(this.hook, `${name}.dependencies`, []).length > 0) {
      this.hook[name].dependencies.forEach(dependency => {
        enableHookNestedDependencies.call(
          this,
          dependency.replace('strapi-hook-', ''),
          flattenHooksConfig,
          true
        );
      });
    }
  }
};

const isAdminInDevMode = function() {
  try {
    fs.accessSync(
      path.resolve(
        this.config.appPath,
        'admin',
        'admin',
        'build',
        'index.html'
      ),
      fs.constants.R_OK | fs.constants.W_OK
    );

    return false;
  } catch (e) {
    return true;
  }
};

const getURLFromSegments = function({ hostname, port, ssl = false }) {
  const protocol = ssl ? 'https' : 'http';
  const defaultPort = ssl ? 443 : 80;
  const portString =
    port === undefined || parseInt(port) === defaultPort ? '' : `:${port}`;

  return `${protocol}://${hostname}${portString}`;
};
