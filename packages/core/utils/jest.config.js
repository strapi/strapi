'use strict';

const baseConfig = require('../../../jest.base-config');
const pkg = require('./package.json');

module.exports = {
  ...baseConfig,
  displayName: (pkg.strapi && pkg.strapi.name) || pkg.name,
  roots: [__dirname],
  testMatch: ['<rootDir>/**/*.test.js'],
};
