'use strict';

// Dependencies.
const glob = require('glob');
const utils = require('../utils');

module.exports = function() {
  return new Promise((resolve, reject) => {
    // Load configurations.
    glob('./api/*/!(config)/*.*(js|json)', {}, (err, files) => {
      if (err) {
        return reject(err);
      }

      files.map(p => utils.setConfig(this, p, 'aggregate', this.loadFile));

      resolve();
    });
  });
};
