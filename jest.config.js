'use strict';

/** @type {import('jest').Config} */
const config = {
  projects: [
    '<rootDir>/packages/plugins/*/jest.config.js',
    '<rootDir>/packages/utils/*/jest.config.js',
    '<rootDir>/packages/generators/*/jest.config.js',
    '<rootDir>/packages/core/*/jest.config.js',
    '<rootDir>/packages/providers/*/jest.config.js',
    '<rootDir>/.github/actions/*/jest.config.js',
  ],
};

module.exports = config;
