'use strict';

const baseConfig = require('../../../jest.base-config');
const pkg = require('./package.json');

module.exports = {
  ...baseConfig,
  displayName: pkg.name,
  roots: [__dirname],
};
