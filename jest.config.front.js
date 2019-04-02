const jest = require('jest');

module.exports = {
  collectCoverageFrom: [
    'packages/strapi-admin/admin/src/**/**/*.js',
    'packages/strapi-plugin-*/admin/src/**/**/*.js',
    'packages/strapi-plugin-*/admin/src/InjectedComponents/*.js',
    'packages/strapi-plugin-*/admin/src/InjectedComponents/tests/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/TableList/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/TableListRow/*.js',
    '!packages/strapi-plugin-*/admin/src/utils/*.js',
    '!packages/strapi-plugin-*/admin/src/**/**/tests/*.test.{js,jsx}',
  ],
  coverageThreshold: {
    // global: {
    //   statements: 90,
    //   branches: 90,
    //   functions: 90,
    //   lines: 90,
    // },
  },
  globals: {
    __webpack_public_path__: 'http://localhost:4000',
    strapi: {},
  },
  moduleDirectories: [
    'node_modules',
    '<rootDir>/packages/strapi-helper-plugin/node_modules',
    '<rootDir>/packages/strapi-helper-plugin',
    '<rootDir>/packages/strapi-helper-plugin/lib/src',
  ],
  moduleNameMapper: {
    '.*\\.(css|less|styl|scss|sass)$':
      '<rootDir>/packages/strapi-helper-plugin/lib/internals/mocks/cssModule.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/packages/strapi-helper-plugin/lib/internals/mocks/image.js',
  },
  rootDir: process.cwd(),
  setupTestFrameworkScriptFile:
    '<rootDir>/packages/strapi-helper-plugin/lib/internals/testing/test-bundler.js',
  setupFiles: [
    '<rootDir>/packages/strapi-helper-plugin/node_modules/raf/polyfill',
    '<rootDir>/packages/strapi-helper-plugin/lib/internals/testing/enzyme-setup.js',
    '<rootDir>/packages/strapi-helper-plugin/lib/internals/testing/strapi.js',
  ],
  testRegex: 'tests/.*\\.test\\.js$',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/fileTransformer.js',
  },
  testURL: 'http://localhost:4000/admin',
};
