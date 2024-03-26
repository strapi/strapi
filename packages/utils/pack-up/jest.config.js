/**
 * @type {import('jest').Config}
 */
const config = {
  preset: '../../../jest-preset.unit.js',
  displayName: 'Pack up',
  collectCoverageFrom: ['src/**/*.ts'],
  globalTeardown: '<rootDir>/tests/teardown.ts',
};

module.exports = config;
