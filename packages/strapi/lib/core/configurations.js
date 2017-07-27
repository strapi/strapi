'use strict';

// Dependencies.
const path = require('path');
const glob = require('glob');
const utils = require('../utils');
const { difference, merge, setWith, get, upperFirst, isString, isEmpty, isObject, orderBy, isBoolean, pullAll, defaults } = require('lodash');

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

    // Define required middlewares categories.
    const middlewareCategories = ['request', 'response', 'security', 'server'];

    // Flatten middlewares configurations.
    const flattenMiddlewaresConfig = middlewareCategories.reduce((acc, index) => {
      const current = this.config.currentEnvironment[index];

      if (isObject(current)) {
        acc = merge(acc, current);
      } else {
        acc[index] = current;
      }

      return acc;
    }, {});

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

    // Preset config in alphabetical order.
    this.config.middleware.settings = Object.keys(this.middlewares).reduce((acc, current) => {
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

    this.config.hook.settings = Object.keys(this.hooks).reduce((acc, current) => {
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

    // Set URL.
    const ssl = get(this.config, 'ssl') || {};

    this.config.url = isString(this.config.proxy)
      ? this.config.proxy
      : `${isEmpty(ssl) || ssl.disabled === true ? 'http' : 'https'}://${this
          .config.host}:${this.config.port}`;
};
