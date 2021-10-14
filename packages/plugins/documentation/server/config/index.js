'use strict';

const defaultConfig = require('./default-config');
const sessionConfig = require('./session-config');

module.exports = {
  default: { ...defaultConfig, ...sessionConfig },
  validator() {},
};
