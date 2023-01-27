'use strict';

const baseConfig = require('../../../jest.base-config.front');
const pkg = require('./package.json');

module.exports = {
  ...baseConfig,
  displayName: (pkg.strapi && pkg.strapi.name) || pkg.name,
  roots: [__dirname],
  collectCoverageFrom: ['<rootDir>/packages/core/admin/admin/**/*.js'],
};
