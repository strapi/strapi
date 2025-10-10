'use strict';

/** @type {import('jest').Config} */
const config = {
  projects: [
    '<rootDir>/packages/plugins/*/jest.config.front.js',
    '<rootDir>/packages/core/*/jest.config.front.js',
    '<rootDir>/scripts/*/jest.config.front.js',
  ],
};

module.exports = config;
