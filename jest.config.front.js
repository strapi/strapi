const path = require('path');
process.env.REMOTE_URL = '/admin';

module.exports = {
  collectCoverageFrom: [
    'packages/strapi-admin/admin/src/**/**/*.{js,jsx}',
    'packages/strapi-plugin-**/**/admin/src/**/**/*.{js,jsx}',
    '!packages/strapi-admin/admin/src/**/**/tests/*.test.{js,jsx}',
    '!packages/strapi-plugin-*/admin/src/**/**/tests/*.test.{js,jsx}',
  ],
  coverageThreshold: {
    global: {
      // NOTE: This should be uncommented at some point

      // statements: 90,
      // branches: 90,
      // functions: 90,
      // lines: 90,
    },
  },
  moduleDirectories: [
    'node_modules',
    '<rootDir>/packages/strapi-admin/admin/src',
    '<rootDir>/packages/strapi-helper-plugin/node_modules',
    '<rootDir>/packages/strapi-helper-plugin/lib/src',
  ],
  moduleNameMapper: {
    '.*\\.(css|less|styl|scss|sass)$': '<rootDir>/packages/strapi-helper-plugin/lib/internals/mocks/cssModule.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/packages/strapi-helper-plugin/lib/internals/mocks/image.js',
    'containers(.*)$': '<rootDir>/packages/strapi-admin/admin/src/containers/$1',
  },
  rootDir: process.cwd(),
  setupTestFrameworkScriptFile: '<rootDir>/packages/strapi-helper-plugin/lib/internals/testing/test-bundler.js',
  setupFiles: [
    '<rootDir>/packages/strapi-helper-plugin/node_modules/raf/polyfill',
    '<rootDir>/packages/strapi-helper-plugin/lib/internals/testing/enzyme-setup.js'
  ],
  testRegex: 'tests/.*\\.test\\.js$',
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  testURL: "http://localhost:4000/admin"
};

