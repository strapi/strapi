'use strict';

const baseConfig = require('./jest.base-config');

module.exports = {
  ...baseConfig,
  projects: [
    '<rootDir>/packages/core/*/jest.config.js',
    '<rootDir>/packages/plugins/*/jest.config.js',
  ],
};
