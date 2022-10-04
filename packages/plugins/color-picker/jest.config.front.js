'use strict';

const baseConfig = require('../../../jest.base-config.front');
const pkg = require('./package.json');

console.log('BASE', baseConfig);

module.exports = {
  ...baseConfig,
  displayName: (pkg.strapi && pkg.strapi.name) || pkg.name,
  roots: [__dirname],
};
