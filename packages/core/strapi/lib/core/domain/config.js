'use strict'

const { defaultsDeep, getOr, set, has } = require('lodash/fp');

const createConfig = (config = {}, defaultConfig = {}) => {
  const currentConfig = defaultsDeep(defaultConfig, config);

  return Object.assign(currentConfig, {
    get(path, defaultValue) {
      return getOr(defaultValue, path, currentConfig);
    },

    set(path, val) {
      set(path, val, currentConfig);
      return this;
    },

    has(path) {
      return has(path, currentConfig);
    },
  });
};

module.exports = {
  createConfig,
};
