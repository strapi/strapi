'use strict';

// Dependencies.
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const utils = require('../utils');
const { parallel } = require('async');
const { setWith, last, upperFirst, lowerFirst, get } = require('lodash');

module.exports = function() {
  this.hooks = {};

  return new Promise((resolve, reject) => {
    // Load configurations.
    glob('./node_modules/strapi-*', {}, (err, files) => {
      if (err) {
        return reject(err);
      }

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

          fs.readFile(path.resolve(this.config.appPath, p, 'package.json'), (err, content) => {
            try {
              const pkg = JSON.parse(content);

              this.hooks[name] = {
                loaded: false,
                identity: name,
                dependencies: get(pkg, 'strapi.dependencies') || []
              };

              // Lazy loading.
              Object.defineProperty(this.hooks[name], 'load', {
                configurable: false,
                enumerable: true,
                get: () => require(path.resolve(this.config.appPath, p))
              });

              cb();
            } catch (e) {
              cb(e);
            }

          });
        }),
        resolve
      );
    });
  });
};
