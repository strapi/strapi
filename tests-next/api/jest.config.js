'use strict';

// JavaScript rather than jest.config.ts: Jest 29 needs ts-node to load a TypeScript config,
// and the repo doesn't depend on it.

/** @type {import('jest').Config} */
const config = {
  displayName: '@strapi/tests-api',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.api-test.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
};

module.exports = config;
