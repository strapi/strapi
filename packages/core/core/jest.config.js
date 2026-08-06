'use strict';

module.exports = {
  preset: '../../../jest-preset.unit.js',
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
  testMatch: ['<rootDir>/**/*.test.ts'],
  displayName: 'Core Strapi',
  // loadStrapi boots a full Strapi instance (migrations, plugins); CI with coverage needs more headroom.
  testTimeout: 30_000,
};
