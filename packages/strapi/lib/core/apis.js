'use strict';

// Dependencies.
const glob = require('glob');
const utils = require('../utils');

module.exports = function() {
  return Promise.all([
    new Promise((resolve, reject) => {
      // Load configurations.
      glob('./api/*/!(config)/*.*(js|json)', {}, (err, files) => {
        if (err) {
          return reject(err);
        }

        files.map(p => utils.setConfig(this, p, 'aggregate', this.loadFile));

        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      // Load configurations.
      glob('./admin/!(config|node_modules)/*.*(js|json)', {}, (err, files) => {
        if (err) {
          return reject(err);
        }

        files.map(p => utils.setConfig(this, p, 'aggregate', this.loadFile));

        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      // Load configurations.
      glob('./plugins/*/!(config|node_modules)/*.*(js|json)', {}, (err, files) => {
        if (err) {
          return reject(err);
        }

        files.map(p => utils.setConfig(this, p, 'aggregate', this.loadFile));

        resolve();
      });
    })
  ]);
};
