'use strict';

// Dependencies.
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const { parallel } = require('async');
const { upperFirst, lowerFirst, get } = require('lodash');

module.exports = function() {
  this.hook = {};

  return Promise.all([
    new Promise((resolve, reject) => {
      const cwd = '';

      // Load configurations.
      glob('./node_modules/strapi-hook-*', {
        cwd: this.config.appPath
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        mountHooks.call(this, files, cwd)(resolve, reject);
      });
    }),
    new Promise((resolve, reject) => {
      const cwd = 'hooks';

      // Load configurations.
      glob('./*', {
        cwd: path.resolve(this.config.appPath, 'hooks')
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
      glob('./*/hooks/*', {
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

        fs.readFile(path.resolve(this.config.appPath, cwd, p, 'package.json'), (err, content) => {
          try {
            const pkg = isPlugin ? {} : JSON.parse(content);

            this.hook[name] = {
              isPlugin,
              loaded: false,
              identity: name,
              dependencies: get(pkg, 'strapi.dependencies') || []
            };

            // Lazy loading.
            Object.defineProperty(this.hook[name], 'load', {
              configurable: false,
              enumerable: true,
              get: () => require(path.resolve(this.config.appPath, cwd, p))
            });

            cb();
          } catch (e) {
            cb(e);
          }

        });
      }),
      (err) => {
        if (err) {
          return reject(err);
        }

        resolve();
      }
    );
};
