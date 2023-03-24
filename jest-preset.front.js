'use strict';

const path = require('path');

const IS_EE = process.env.IS_EE === 'true';

const moduleNameMapper = {
  '.*\\.(css|less|styl|scss|sass)$': path.join(
    __dirname,
    'packages/admin-test-utils/lib/mocks/cssModule.js'
  ),
  '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ico)$':
    path.join(__dirname, 'packages/admin-test-utils/lib/mocks/image.js'),
  '^ee_else_ce(/.*)$': IS_EE
    ? [
        path.join(__dirname, 'packages/core/admin/ee/admin$1'),
        path.join(__dirname, 'packages/core/content-manager/ee/admin/src$1'),
        path.join(__dirname, 'packages/core/content-type-builder/ee/admin/src$1'),
        path.join(__dirname, 'packages/core/upload/ee/admin/src$1'),
        path.join(__dirname, 'packages/core/email/ee/admin/src$1'),
        path.join(__dirname, 'packages/plugins/*/ee/admin/src$1'),
      ]
    : [
        path.join(__dirname, 'packages/core/admin/admin/src$1'),
        path.join(__dirname, 'packages/core/content-manager/admin/src$1'),
        path.join(__dirname, 'packages/core/content-type-builder/admin/src$1'),
        path.join(__dirname, 'packages/core/upload/admin/src$1'),
        path.join(__dirname, 'packages/core/email/admin/src$1'),
        path.join(__dirname, 'packages/plugins/*/admin/src$1'),
      ],
};

module.exports = {
  rootDir: __dirname,
  moduleNameMapper,
  testPathIgnorePatterns: ['/node_modules/', '__tests__'],
  globalSetup: path.join(__dirname, 'test/config/front/global-setup.js'),
  setupFiles: [
    path.join(__dirname, 'packages/admin-test-utils/lib/setup/test-bundler.js'),
    path.join(__dirname, 'packages/admin-test-utils/lib/mocks/fetch.js'),
    path.join(__dirname, 'packages/admin-test-utils/lib/mocks/LocalStorageMock.js'),
    path.join(__dirname, 'packages/admin-test-utils/lib/mocks/IntersectionObserver.js'),
    path.join(__dirname, 'packages/admin-test-utils/lib/mocks/ResizeObserver.js'),
    path.join(__dirname, 'packages/admin-test-utils/lib/mocks/windowMatchMedia.js'),
    path.join(__dirname, 'packages/admin-test-utils/lib/mocks/mockRangeApi.js'),
  ],
  setupFilesAfterEnv: [
    path.join(__dirname, '/packages/admin-test-utils/lib/setup/styled-components.js'),
    path.join(__dirname, '/packages/admin-test-utils/lib/setup/strapi.js'),
    path.join(__dirname, '/packages/admin-test-utils/lib/setup/prop-types.js'),
  ],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': [
      '@swc/jest',
      {
        env: {
          coreJs: '3.28.0',
          mode: 'usage',
        },

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
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      path.join(__dirname, 'fileTransformer.js'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-dnd|dnd-core|react-dnd-html5-backend|@strapi/design-system|@strapi/icons|fractional-indexing)/)',
  ],
  testMatch: ['/**/tests/**/?(*.)+(spec|test).[jt]s?(x)'],
  testEnvironmentOptions: {
    url: 'http://localhost:1337/admin',
  },
  // Use `jest-watch-typeahead` version 0.6.5. Newest version 1.0.0 does not support jest@26
  // Reference: https://github.com/jest-community/jest-watch-typeahead/releases/tag/v1.0.0
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
