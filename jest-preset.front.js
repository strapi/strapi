'use strict';

const path = require('path');

const moduleNameMapper = {
  '.*\\.(css|less|styl|scss|sass)$': '@strapi/admin-test-utils/file-mock',
  '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ico)$':
    '@strapi/admin-test-utils/file-mock',
  /**
   * we're mapping the following packages to the monorepos node_modules
   * so if you link a package e.g. `design-system` the correct dependencies
   * are used and the tests run correctly.
   **/
  '^react$': path.join(__dirname, 'node_modules/react'),
  '^react-dom$': path.join(__dirname, 'node_modules/react-dom'),
  '^react-router-dom$': path.join(__dirname, 'node_modules/react-router-dom'),
  '^styled-components$': path.join(__dirname, 'node_modules/styled-components'),
};

/**
 * @type {import('jest').Config}
 */
module.exports = {
  rootDir: __dirname,
  moduleNameMapper,
  /* Tells jest to ignore duplicated manual mock files, such as index.js */
  modulePathIgnorePatterns: ['.*__mocks__.*'],
  testPathIgnorePatterns: ['node_modules/', 'dist/'],
  globalSetup: '@strapi/admin-test-utils/global-setup',
  setupFiles: ['@strapi/admin-test-utils/setup'],
  setupFilesAfterEnv: ['@strapi/admin-test-utils/after-env'],
  testEnvironment: '@strapi/admin-test-utils/environment',
  prettierPath: require.resolve('prettier-2'),
  transform: {
    '^.+\\.js(x)?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            jsx: true,
            dynamicImport: true,
          },
          // this should match the minimum supported node.js version
          target: 'es2020',
        },
      },
    ],
    '\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
          },
        },
      },
    ],
    '\\.tsx$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      path.join(__dirname, 'fileTransformer.js'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-dnd|dnd-core|react-dnd-html5-backend|@react-dnd|fractional-indexing)/)',
  ],
  testMatch: ['**/tests/**/?(*.)+(spec|test).[jt]s?(x)'],
  testEnvironmentOptions: {
    url: 'http://localhost:1337/admin',
  },
  // Use `jest-watch-typeahead` version 0.6.5. Newest version 1.0.0 does not support jest@26
  // Reference: https://github.com/jest-community/jest-watch-typeahead/releases/tag/v1.0.0
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],

  // NOTE: this doesn't work with projects due to a jest bug, so we also set it
  // using jest.setTimeout() in the after-env script
  testTimeout: 60 * 1000,
};
