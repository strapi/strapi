'use strict'

const IS_EE = process.env.IS_EE === 'true';

const moduleNameMapper = {
  '.*\\.(css|less|styl|scss|sass)$': '<rootDir>/test/config/front/mocks/cssModule.js',
  '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ico)$':
    '<rootDir>/test/config/front/mocks/image.js',
  '^ee_else_ce(/.*)$': IS_EE ? [
      '<rootDir>/packages/core/admin/ee/admin$1',
      '<rootDir>/packages/core/content-manager/ee/admin/src$1',
      '<rootDir>/packages/core/content-type-builder/ee/admin/src$1',
      '<rootDir>/packages/core/upload/ee/admin/src$1',
      '<rootDir>/packages/core/email/ee/admin/src$1',
      '<rootDir>/packages/plugins/*/ee/admin/src$1',
    ]
    : [
      '<rootDir>/packages/core/admin/admin/src$1',
      '<rootDir>/packages/core/content-manager/admin/src$1',
      '<rootDir>/packages/core/content-type-builder/admin/src$1',
      '<rootDir>/packages/core/upload/admin/src$1',
      '<rootDir>/packages/core/email/admin/src$1',
      '<rootDir>/packages/plugins/*/admin/src$1',
    ],
};

module.exports = {
  moduleNameMapper,
  collectCoverageFrom: [
    '<rootDir>/packages/core/*/admin/src/**/*.js',
    '<rootDir>/packages/plugins/*/admin/src/**/*.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/examples/getstarted/',
    '<rootDir>/packages/strapi-helper-plugin/dist/',
    '__tests__',
  ],
  setupFiles: [
    '<rootDir>/test/config/front/test-bundler.js',
    '<rootDir>/packages/admin-test-utils/lib/mocks/LocalStorageMock.js',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/config/front/enzyme-setup.js',
    '<rootDir>/test/config/front/strapi.js',
  ],
  transform: {
    '^.+\\.js$': ['@swc-node/jest', { jsx: true, dynamicImport: true }],
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/fileTransformer.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(react-dnd|dnd-core|react-dnd-html5-backend)/)'],
  testURL: 'http://localhost:4000/admin',
  testMatch: ['/**/tests/**/?(*.)+(spec|test).[jt]s?(x)']
}
