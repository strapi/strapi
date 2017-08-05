'use strict';

// Dependencies.
const path = require('path');
const glob = require('glob');
const utils = require('../utils');
const {merge, setWith, get, upperFirst, isString, isEmpty, isObject, pullAll, defaults, isPlainObject } = require('lodash');

module.exports.nested = function() {
  return Promise.all([
    // Load root configurations.
    new Promise((resolve, reject) => {
      glob('./config/**/*.*(js|json)', {}, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load APIs configurations.
    new Promise((resolve, reject) => {
      glob('./api/*/config/**/*.*(js|json)', {}, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load plugins configurations.
    new Promise((resolve, reject) => {
      glob('./plugins/*/config/**/*.*(js|json)', {}, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load plugins configurations.
    new Promise((resolve, reject) => {
      glob('./admin/config/**/*.*(js|json)', {}, (err, files) => {
        if (err) {
          return reject(err);
        }

        utils.loadConfig.call(this, files).then(resolve).catch(reject);
      });
    }),
    // Load plugins configurations.
    new Promise((resolve, reject) => {
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
    this.config.info.strapi = (get(this.config, 'info.dependencies.strapi') || '').replace(/(\^|~)/g, ''),
    this.config.info.node = process.versions.node;

    // Set connections.
    this.connections = {};

    // Set current environment config.
    this.config.currentEnvironment = this.config.environments[this.config.environment] || {};

    // Set current connections.
    this.config.connections = get(this.config.currentEnvironment, `database.connections`, {});

    // Template literal string.
    this.config = templateConfigurations(this.config);

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
      responses: {
        enabled: true
      },
      router: {
        enabled: true
      },
      boom: {
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
      const connector = connection.connector.replace('strapi-', '');

      enableHookNestedDependencies.call(this, connector, flattenHooksConfig);
    }

    // Preset config in alphabetical order.
    this.config.middleware.settings = Object.keys(this.middleware).reduce((acc, current) => {
      // Try to find the settings in the current environment, then in the main configurations.
      const currentSettings = flattenMiddlewaresConfig[current] || this.config[current];
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
      const currentSettings = flattenHooksConfig[current] || this.config[current];

      if (isString(currentSettings)) {
        acc[current] = currentSettings;
      } else {
        acc[current] = !isObject(currentSettings) ? {} : currentSettings;

        if (!acc[current].hasOwnProperty('enabled')) {
          this.log.warn(`(hook:${current}) wasn't loaded due to missing key \`enabled\` in the configuration`);
        }

        // Ensure that enabled key exist by forcing to false.
        defaults(acc[current], { enabled : false });
      }

      return acc;
    }, {});

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
          this.api[key].models[index].globalId = upperFirst(index);
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

      acc[key] = this.plugins[key];

      return acc;
    }, {});

    // Set URL.
    const ssl = get(this.config, 'ssl') || {};

    this.config.url = isString(this.config.proxy)
      ? this.config.proxy
      : `${isEmpty(ssl) || ssl.disabled === true ? 'http' : 'https'}://${this
          .config.host}:${this.config.port}`;
};

const enableHookNestedDependencies = function (name, flattenHooksConfig) {
  if (!this.hook[name]) {
      this.log.warn(`(hook:${name}) \`strapi-${name}\` is missing in your dependencies. Please run \`npm install strapi-${name}\``);
  }

  // Couldn't find configurations for this hook.
  if (isEmpty(get(flattenHooksConfig, name, true))) {
    flattenHooksConfig[name] = {
      enabled: true
    };

    // Enabled dependencies.
    if (get(this.hook, `${name}.dependencies`, []).length > 0) {
      this.hook[name].dependencies.forEach(dependency => {
        enableHookNestedDependencies.call(this, dependency.replace('strapi-', ''), flattenHooksConfig);
      });
    }
  }
};

  /**
 * Allow dynamic config values through
 * the native ES6 template string function.
 */
const templateConfigurations = function (obj) {
  // Allow values which looks like such as
  // an ES6 literal string without parenthesis inside (aka function call).
  const regex = /\$\{[^()]*\}/g;

  return Object.keys(obj).reduce((acc, key) => {
    if (isPlainObject(obj[key])) {
      acc[key] = templateConfigurations(obj[key]);
    } else if (isString(obj[key]) && regex.test(obj[key])) {
      acc[key] = eval('`' + obj[key] + '`');
    } else {
      acc[key] = obj[key];
    }

    return acc;
  }, {});
};
