'use strict';

const baseConfig = require('../../../jest.base-config');
const pkg = require('./package');

module.exports = {
  ...baseConfig,
  displayName: (pkg.strapi && pkg.strapi.name) || pkg.name,
  roots: [__dirname],
};
