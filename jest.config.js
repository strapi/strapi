'use strict';

const baseConfig = require('./jest.base-config')

module.exports = {
  ...baseConfig,
  projects: [
    '<rootDir>/packages/core/admin',
    '<rootDir>/packages/core/content-manager',
    '<rootDir>/packages/core/content-type-builder',
    '<rootDir>/packages/core/database',
    '<rootDir>/packages/core/email',
    '<rootDir>/packages/core/helper-plugin',
    '<rootDir>/packages/core/strapi',
    '<rootDir>/packages/core/upload',
    '<rootDir>/packages/core/utils',
  ]
};

