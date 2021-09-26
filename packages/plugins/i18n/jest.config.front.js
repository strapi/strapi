'use strict';

const baseConfig = require('../../../jest.base-config.front');
const pkg = require('./package');

module.exports = {
  ...baseConfig,
  displayName: (pkg.strapi && pkg.strapi.name) || pkg.name,
  roots: ['<rootDir>/packages/plugins/i18n'],
};
