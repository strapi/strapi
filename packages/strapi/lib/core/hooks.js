'use strict';

// Dependencies.
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const utils = require('../utils');
const { parallel } = require('async');
const { setWith, last, upperFirst, lowerFirst, get } = require('lodash');

module.exports = function() {
  this.hook = {};

  return Promise.all([
    new Promise((resolve, reject) => {
      const cwd = '';

      // Load configurations.
      glob('./node_modules/strapi-*', {
        ignore: [
          './node_modules/strapi-admin',
          './node_modules/strapi-utils',
          './node_modules/strapi-generate*',
          './node_modules/strapi-plugin-*',
          './node_modules/strapi-helper-*'
        ]
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        mountHooks.call(this, files, cwd)(resolve, reject)
      });
    }),
    new Promise((resolve, reject) => {
      const cwd = 'hooks';

      // Load configurations.
      glob('./*', {
        cwd: path.resolve(process.cwd(), 'hooks')
      }, (err, files) => {
        if (err) {
          return reject(err);
        }

        mountHooks.call(this, files, cwd)(resolve, reject);
      });
    })
  ]);
};

const mountHooks = function (files, cwd) {
  return (resolve, reject) =>
    parallel(
      files.map(p => cb => {
        const extractStr = p
          .split('/')
          .pop()
          .replace(/^strapi(-|\.)/, '')
          .split('-');

        const name = lowerFirst(
          extractStr.length === 1
            ? extractStr[0]
            : extractStr.map(p => upperFirst(p)).join('')
        );

        fs.readFile(path.resolve(this.config.appPath, cwd, p, 'package.json'), (err, content) => {
          try {
            const pkg = JSON.parse(content);

            this.hook[name] = {
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
      resolve
    );
};
