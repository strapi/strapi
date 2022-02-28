'use strict';

const baseConfig = require('./jest.base-config');

module.exports = {
  ...baseConfig,
  projects: ['<rootDir>/.github', '<rootDir>/packages/**/jest.config.js'],
};
