'use strict';

const baseConfig = require('./jest.base-config');

module.exports = {
  ...baseConfig,
  projects: ['<rootDir>/packages/**/jest.config.js'],
};
