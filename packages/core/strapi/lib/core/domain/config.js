'use strict';

const { defaultsDeep } = require('lodash/fp');

const createConfig = (config = {}, defaultConfig = {}) => {
  return defaultsDeep(defaultConfig, config);
};

module.exports = {
  createConfig,
};
