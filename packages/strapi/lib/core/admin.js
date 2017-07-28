'use strict';

// Dependencies.
const glob = require('glob');
const utils = require('../utils');

module.exports = function() {
  return new Promise((resolve, reject) => {
    // Load configurations.
    glob('./admin/*/(config|public)/*.*(js|json)', {}, (err, files) => {
      if (err) {
        return reject(err);
      }

      console.log(files);

      files.map(p => utils.setConfigAdmin(this, p, 'aggregate', this.loadFile));

      resolve();
    });
  });
};
