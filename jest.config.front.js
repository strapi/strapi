const baseConfig = require('./jest.base-config.front');

module.exports = {
  ...baseConfig,
  projects: [
    '<rootDir>/packages/core/*/jest.config.front.js',
    '<rootDir>/packages/plugins/*/jest.config.front.js',
  ],
};
