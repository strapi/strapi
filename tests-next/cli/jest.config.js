'use strict';

const path = require('node:path');

// JavaScript rather than jest.config.ts: Jest 29 needs ts-node to load a TypeScript config,
// and the repo doesn't depend on it.

/** @type {import('jest').Config} */
const config = {
  displayName: '@strapi/tests-cli',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.cli-test.ts'],
  testEnvironment: 'node',
  // In CI, a JUnit report next to the generated apps, uploaded as an artifact.
  reporters: process.env.CI
    ? [
        'default',
        [
          'jest-junit',
          {
            outputDirectory: path.join(__dirname, '../../test-apps/next/reports/junit'),
            outputName: 'cli.xml',
          },
        ],
      ]
    : ['default'],
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
};

module.exports = config;
