const baseConfig = require('../../../jest.base-config.front');
const pkg = require('./package.json');

module.exports = {
  ...baseConfig,
  displayName: (pkg.strapi && pkg.strapi.name) || pkg.name,
  roots: ['<rootDir>/packages/core/helper-plugin'],
};
