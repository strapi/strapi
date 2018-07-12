'use strict';

// Dependencies.
const path = require('path');
const glob = require('glob');
const { parallel } = require('async');
const { endsWith } = require('lodash');

module.exports = function() {
  this.hook = {};

  return Promise.all([
    new Promise((resolve, reject) => {
      const cwd = this.config.appPath;

      // Load configurations.
      glob('./node_modules/*(strapi-hook-*)/*/*(index|defaults).*(js|json)', {
        cwd
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        mountHooks.call(this, files, cwd)(resolve, reject);
      });
    }),
    new Promise((resolve, reject) => {
      const cwd = path.resolve(this.config.appPath, 'hooks');

      // Load configurations.
      glob('./*/*(index|defaults).*(js|json)', {
        cwd
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        mountHooks.call(this, files, cwd)(resolve, reject);
      });
    }),
    new Promise((resolve, reject) => {
      const cwd = path.resolve(this.config.appPath, 'plugins');

      // Load configurations.
      glob('./*/hooks/*/*(index|defaults).*(js|json)', {
        cwd
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        mountHooks.call(this, files, cwd, true)(resolve, reject);
      });
    })
  ]);
};

const mountHooks = function (files, cwd, isPlugin) {
  return (resolve, reject) =>
    parallel(
      files.map(p => cb => {
        const folders = p.replace(/^.\/node_modules\/strapi-hook-/, './')
          .split('/');
        const name = isPlugin ? folders[folders.length - 2] : folders[1];

        this.hook[name] = this.hook[name] || {
          loaded: false
        };

        if (endsWith(p, 'index.js') && !this.hook[name].load) {
          // Lazy loading.
          Object.defineProperty(this.hook[name], 'load', {
            configurable: false,
            enumerable: true,
            get: () => require(path.resolve(cwd, p))(this)
          });
        } else if (endsWith(p, 'defaults.json')) {
          this.hook[name].defaults = require(path.resolve(cwd, p));
        }

        cb();
      }),
      (err) => {
        if (err) {
          return reject(err);
        }

        resolve();
      }
    );
};
