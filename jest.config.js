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

  // Coverage configuration for monorepo
  collectCoverage: false, // Will be enabled via CLI flag
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '<rootDir>/packages/**/*.{js,ts}',
    '!<rootDir>/packages/**/*.d.ts',
    '!<rootDir>/packages/**/node_modules/**',
    '!<rootDir>/packages/**/dist/**',
    '!<rootDir>/packages/**/build/**',
    '!<rootDir>/packages/**/*.config.{js,ts,mjs}',
    '!<rootDir>/packages/**/jest*.{js,ts}',
    '!<rootDir>/packages/**/rollup*.{js,ts,mjs}',
    '!<rootDir>/packages/**/babel*.{js,ts}',
    '!<rootDir>/packages/**/test/**',
    '!<rootDir>/packages/**/tests/**',
    '!<rootDir>/packages/**/__tests__/**',
    '!<rootDir>/packages/**/*.test.{js,ts}',
    '!<rootDir>/packages/**/*.spec.{js,ts}',
    '!<rootDir>/packages/**/examples/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/test/',
    '/tests/',
    '/__tests__/',
    '\\.config\\.',
    '\\.test\\.',
    '\\.spec\\.',
    'jest\\.',
    'rollup\\.',
    'babel\\.',
  ],
};

module.exports = config;
