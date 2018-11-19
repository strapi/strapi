'use strict';

// Dependencies.
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { merge, setWith, get, upperFirst, isEmpty, isObject, pullAll, defaults, assign, clone, cloneDeep, camelCase } = require('lodash');
const { templateConfiguration } = require('strapi-utils');
const utils = require('../utils');

module.exports.nested = function() {
  return Promise.all([
    // Load root configurations.
    new Promise((resolve, reject) => {
      glob('./config/**/*.*(js|json)', {
        cwd: this.config.appPath,
        dot: true
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load APIs configurations.
    new Promise((resolve, reject) => {
      glob('./api/*/config/**/*.*(js|json)', {
        cwd: this.config.appPath
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load plugins configurations.
    new Promise((resolve, reject) => {
      glob('./plugins/*/config/**/*.*(js|json)', {
        cwd: this.config.appPath
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load admin configurations.
    new Promise((resolve, reject) => {
      glob('./admin/config/**/*.*(js|json)', {
        cwd: this.config.appPath
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load plugins configurations.
    new Promise(resolve => {
      setWith(
        this,
        'config.info',
        require(path.resolve(process.cwd(), 'package.json')),
        Object
      );

      resolve();
    })
  ]);
};

module.exports.app = async function() {
  // Retrieve Strapi version.
  this.config.uuid = get(this.config.info, 'strapi.uuid', '');
  this.config.info.customs = get(this.config.info, 'strapi', {});
  this.config.info.strapi = (get(this.config, 'info.dependencies.strapi') || '').replace(/(\^|~)/g, ''),
  this.config.info.node = process.versions.node;

  // Set connections.
  this.connections = {};

  // Set current environment config.
  this.config.currentEnvironment = this.config.environments[this.config.environment] || {};

  // Set current connections.
  this.config.connections = get(this.config.currentEnvironment, 'database.connections', {});

  if (get(this.config, 'language.enabled')) {
    this.config.language.locales = Object.keys(get(strapi.config, 'locales', {}));
  }

  // Template literal string.
  this.config = templateConfiguration(this.config);

  // Initialize main router to use it in middlewares.
  this.router = this.koaMiddlewares.routerJoi();

  // Set controllers.
  this.controllers = Object.keys(this.api || []).reduce((acc, key) => {
    for (let index in this.api[key].controllers) {
      if (!this.api[key].controllers[index].identity) {
        this.api[key].controllers[index].identity = upperFirst(index);
      }

      acc[index] = this.api[key].controllers[index];
    }

    return acc;
  }, {});

  // Set models.
  this.models = Object.keys(this.api || []).reduce((acc, key) => {
    for (let index in this.api[key].models) {
      if (!this.api[key].models[index].globalId) {
        this.api[key].models[index].globalId = upperFirst(camelCase(index));
      }

      if (!this.api[key].models[index].connection) {
        this.api[key].models[index].connection = this.config.currentEnvironment.database.defaultConnection;
      }

      if (!this.api[key].models[index].collectionName) {
        this.api[key].models[index].collectionName = (`${index}`).toLowerCase();
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
    return acc.concat(get(this.api[key], 'config.routes') || {});
  }, []);

  // Set admin controllers.
  this.admin.controllers = Object.keys(this.admin.controllers || []).reduce((acc, key) => {
    if (!this.admin.controllers[key].identity) {
      this.admin.controllers[key].identity = key;
    }

    acc[key] = this.admin.controllers[key];

    return acc;
  }, {});

  // Set admin models.
  this.admin.models = Object.keys(this.admin.models || []).reduce((acc, key) => {
    if (!this.admin.models[key].identity) {
      this.admin.models[key].identity = upperFirst(key);
    }

    if (!this.admin.models[key].globalId) {
      this.admin.models[key].globalId = upperFirst(camelCase(`admin-${key}`));
    }

    if (!this.admin.models[key].connection) {
      this.admin.models[key].connection = this.config.currentEnvironment.database.defaultConnection;
    }

    acc[key] = this.admin.models[key];

    return acc;
  }, {});

  this.plugins = Object.keys(this.plugins).reduce((acc, key) => {
    this.plugins[key].controllers = Object.keys(this.plugins[key].controllers || []).reduce((sum, index) => {
      if (!this.plugins[key].controllers[index].identity) {
        this.plugins[key].controllers[index].identity = index;
      }

      sum[index] = this.plugins[key].controllers[index];

      return sum;
    }, {});

    this.plugins[key].models = Object.keys(this.plugins[key].models || []).reduce((sum, index) => {
      if (!this.plugins[key].models[index].connection) {
        this.plugins[key].models[index].connection = this.config.currentEnvironment.database.defaultConnection;
      }

      if (!this.plugins[key].models[index].globalId) {
        this.plugins[key].models[index].globalId = upperFirst(camelCase(`${key}-${index}`));
      }

      if (!this.plugins[key].models[index].collectionName) {
        this.plugins[key].models[index].collectionName = `${key}_${index}`.toLowerCase();
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
    const current = merge(this.config.currentEnvironment[index], {
      public: defaults(this.config.public, {
        enabled: true
      }),
      favicon: defaults(this.config.favicon, {
        enabled: true
      })
    });

    if (isObject(current)) {
      acc = merge(acc, current);
    } else {
      acc[index] = current;
    }

    return acc;
  }, {});

  // These middlewares cannot be disabled.
  merge(flattenMiddlewaresConfig, {
    // Necessary middlewares for the core.
    responses: {
      enabled: true
    },
    router: {
      enabled: true
    },
    logger: {
      enabled: true
    },
    boom: {
      enabled: true
    },
    mask: {
      enabled: true
    },
    // Necessary middlewares for the administration panel.
    cors: {
      enabled: true
    },
    xframe: {
      enabled: true
    },
    xss: {
      enabled: true
    }
  });

  // Exclude database and custom.
  middlewareCategories.push('database');

  // Flatten hooks configurations.
  const flattenHooksConfig = pullAll(Object.keys(this.config.currentEnvironment), middlewareCategories).reduce((acc, index) => {
    const current = this.config.currentEnvironment[index];

    if (isObject(current)) {
      acc = merge(acc, {
        [index]: current
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
  this.config.middleware.settings = Object.keys(this.middleware).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = merge(get(cloneDeep(this.middleware[current]), ['defaults', current], {}), flattenMiddlewaresConfig[current] || this.config.currentEnvironment[current] || this.config[current]);
    acc[current] = !isObject(currentSettings) ? {} : currentSettings;

    if (!acc[current].hasOwnProperty('enabled')) {
      this.log.warn(`(middleware:${current}) wasn't loaded due to missing key \`enabled\` in the configuration`);
    }

    // Ensure that enabled key exist by forcing to false.
    defaults(acc[current], { enabled : false });

    return acc;
  }, {});

  this.config.hook.settings = Object.keys(this.hook).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = merge(get(cloneDeep(this.hook[current]), ['defaults', current], {}), flattenHooksConfig[current] || get(this.config.currentEnvironment, ['hook', current]) || get(this.config, ['hook', current]));
    acc[current] = !isObject(currentSettings) ? {} : currentSettings;

    if (!acc[current].hasOwnProperty('enabled')) {
      this.log.warn(`(hook:${current}) wasn't loaded due to missing key \`enabled\` in the configuration`);
    }

    // Ensure that enabled key exist by forcing to false.
    defaults(acc[current], { enabled : false });

    return acc;
  }, {});

  // default settings
  this.config.port = get(this.config.currentEnvironment, 'server.port') || this.config.port;
  this.config.host = get(this.config.currentEnvironment, 'server.host') || this.config.host;
  this.config.url = `http://${this.config.host}:${this.config.port}`;

  // Admin.
  this.config.admin.devMode = isAdminInDevMode.call(this);
  this.config.admin.url = this.config.admin.devMode ?
    `http://${this.config.host}:4000/${get(this.config.currentEnvironment.server, 'admin.path', 'admin')}`:
    `${this.config.url}/${get(this.config.currentEnvironment.server, 'admin.path', 'admin')}`;

  // proxy settings
  this.config.proxy = get(this.config.currentEnvironment, 'server.proxy', {});

  // check if SSL enabled and construct proxy url
  function getProxyUrl(ssl, url) {
    return `http${ssl ? 's' : ''}://${url}`;
  }

  // check if proxy is enabled and construct url
  if (get(this.config, 'proxy.enabled')) {
    this.config.url = getProxyUrl(this.config.proxy.ssl, `${this.config.proxy.host}:${this.config.proxy.port}`);
  }
};

const enableHookNestedDependencies = function (name, flattenHooksConfig, force = false) {
  if (!this.hook[name]) {
    this.log.warn(`(hook:${name}) \`strapi-hook-${name}\` is missing in your dependencies. Please run \`npm install strapi-hook-${name}\``);
  }

  // Couldn't find configurations for this hook.
  if (isEmpty(get(flattenHooksConfig, name, true))) {
    // Check if database connector is used
    const modelsUsed = Object.keys(assign(clone(this.api) || {}, this.plugins))
      .filter(x => isObject(get(this.api, [x, 'models']) || get(this.plugins, [x, 'models']))) // Filter API with models
      .map(x => get(this.api, [x, 'models']) || get(this.plugins, [x, 'models'])) // Keep models
      .filter(models => {
        const apiModelsUsed = Object.keys(models).filter(model => {
          const connector = get(this.config.connections, models[model].connection, {}).connector;

          if (connector) {
            return connector.replace('strapi-hook-', '') === name;
          }

          return false;
        });

        return apiModelsUsed.length !== 0;
      }); // Filter model with the right connector

    flattenHooksConfig[name] = {
      enabled: force || modelsUsed.length > 0 // Will return false if there is no model, else true.
    };

    // Enabled dependencies.
    if (get(this.hook, `${name}.dependencies`, []).length > 0) {
      this.hook[name].dependencies.forEach(dependency => {
        enableHookNestedDependencies.call(this, dependency.replace('strapi-hook-', ''), flattenHooksConfig, true);
      });
    }
  }
};

const isAdminInDevMode = function () {
  try {
    fs.accessSync(path.resolve(this.config.appPath, 'admin', 'admin', 'build', 'index.html'), fs.constants.R_OK | fs.constants.W_OK);

    return false;
  } catch (e) {
    return true;
  }
};
