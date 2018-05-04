'use strict';

// Dependencies.
const path = require('path');
const glob = require('glob');
const { parallel } = require('async');
const { upperFirst, lowerFirst, endsWith } = require('lodash');

module.exports = function() {
  this.middleware = {};
  this.koaMiddlewares = {};

  return Promise.all([
    new Promise((resolve, reject) => {
      const cwd = path.resolve(__dirname, '..', '..');

      glob(
        './node_modules/*(koa-*|kcors)',
        {
          cwd
        },
        (err, files) => {
          if (err) {
            return reject(err);
          }

          requireMiddlewares.call(this, files, cwd)(resolve, reject);
        }
      );
    }),
    new Promise((resolve, reject) => {
      const cwd = this.config.appPath;

      glob(
        './node_modules/*(koa-*|kcors)',
        {
          cwd
        },
        (err, files) => {
          if (err) {
            return reject(err);
          }

          requireMiddlewares.call(this, files, cwd)(resolve, reject);
        }
      );
    }),
    new Promise((resolve, reject) => {
      const cwd = this.config.appPath;

      glob(
        './node_modules/*(strapi-middleware-*)/*/*(index|defaults).*(js|json)',
        {
          cwd
        },
        (err, files) => {
          if (err) {
            return reject(err);
          }

          mountMiddlewares.call(this, files, cwd)(resolve, reject);
        }
      );
    }),
    new Promise((resolve, reject) => {
      const cwd = path.resolve(__dirname, '..', 'middlewares');

      glob(
        './*/*(index|defaults).*(js|json)',
        {
          cwd
        },
        (err, files) => {
          if (err) {
            return reject(err);
          }

          mountMiddlewares.call(this, files, cwd)(resolve, reject);
        }
      );
    }),
    new Promise((resolve, reject) => {
      const cwd = path.resolve(this.config.appPath, 'middlewares');

      glob(
        './*/*(index|defaults).*(js|json)',
        {
          cwd
        },
        (err, files) => {
          if (err) {
            return reject(err);
          }

          mountMiddlewares.call(this, files, cwd)(resolve, reject);
        }
      );
    }),
    new Promise((resolve, reject) => {
      const cwd = path.resolve(this.config.appPath, 'plugins');

      glob(
        './*/middlewares/*/*(index|defaults).*(js|json)',
        {
          cwd
        },
        (err, files) => {
          if (err) {
            return reject(err);
          }

          mountMiddlewares.call(this, files, cwd, true)(resolve, reject);
        }
      );
    })
  ]);
};

const requireMiddlewares = function (files, cwd) {
  return (resolve, reject) =>
    parallel(
      files.map(p => cb => {
        const extractStr = p
          .split('/')
          .pop()
          .replace(/^koa(-|\.)/, '')
          .split('-');

        const name = lowerFirst(
          extractStr.length === 1
            ? extractStr[0]
            : extractStr.map(p => upperFirst(p)).join('')
        );

        // Lazy loading.
        if (!this.koaMiddlewares.hasOwnProperty(name)) {
          Object.defineProperty(this.koaMiddlewares, name, {
            configurable: false,
            enumerable: true,
            get: () => require(path.resolve(cwd, p))
          });
        }

        cb();
      }),
      err => {
        if (err) {
          return reject(err);
        }

        resolve();
      }
    );
};

const mountMiddlewares = function (files, cwd, isPlugin) {
  return (resolve, reject) =>
    parallel(
      files.map(p => cb => {
        const folders = p.replace(/^.\/node_modules\/strapi-middleware-/, './')
          .split('/');
        const name = isPlugin ? folders[folders.length - 2] : folders[1];

        this.middleware[name] = this.middleware[name] || {
          loaded: false
        };

        if (endsWith(p, 'index.js') && !this.middleware[name].load) {
          // Lazy loading.
          Object.defineProperty(this.middleware[name], 'load', {
            configurable: false,
            enumerable: true,
            get: () => require(path.resolve(cwd, p))(this)
          });
        } else if (endsWith(p, 'defaults.json')) {
          this.middleware[name].defaults = require(path.resolve(cwd, p));
        }

        cb();
      }),
      err => {
        if (err) {
          return reject(err);
        }

        resolve();
      }
    );
};
