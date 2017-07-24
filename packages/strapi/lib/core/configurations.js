'use strict';

// Dependencies.
const path = require('path');
const glob = require('glob');
const utils = require('../utils');
const { difference, merge, setWith, get, upperFirst, isString, isEmpty } = require('lodash');

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
    // Set connections.
    this.connections = {};

    this.config.connections = this.config.environments[
      this.config.environment
    ].databases.connections;

    // Set controllers.
    this.controllers = Object.keys(this.api).reduce((acc, key) => {
      for (let index in this.api[key].controllers) {
        if (!this.api[key].controllers[index].identity) {
          this.api[key].controllers[index].identity = upperFirst(index);
        }

        acc[index] = this.api[key].controllers[index];
      }

      return acc;
    }, {});

    // Set models.
    this.models = Object.keys(this.api).reduce((acc, key) => {
      for (let index in this.api[key].models) {
        if (!this.api[key].models[index].globalId) {
          this.api[key].models[index].globalId = upperFirst(index);
        }

        acc[index] = this.api[key].models[index];
      }
      return acc;
    }, {});

    // Set services.
    this.services = Object.keys(this.api).reduce((acc, key) => {
      for (let index in this.api[key].services) {
        acc[index] = this.api[key].services[index];
      }

      return acc;
    }, {});

    // Set routes.
    this.config.routes = Object.keys(this.api).reduce((acc, key) => {
      return acc.concat(get(this.api[key], 'config.routes') || {});
    }, []);

    // Set URL.
    const ssl = get(this.config, 'ssl') || {};

    this.config.url = isString(this.config.proxy)
      ? this.config.proxy
      : `${isEmpty(ssl) || ssl.disabled === true ? 'http' : 'https'}://${this
          .config.host}:${this.config.port}`;
};
