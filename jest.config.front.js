const jest = require('jest');

module.exports = {
  collectCoverageFrom: [
    // 'packages/strapi-admin/admin/src/**/**/*.{js,jsx}',
    'packages/strapi-plugin-content-type-builder/admin/src/**/**/*.js',
    'packages/strapi-plugin-content-type-builder/admin/src/InjectedComponents/*.js',
    'packages/strapi-plugin-content-type-builder/admin/src/InjectedComponents/tests/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/containers/AppOld/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/containers/HomePageOld/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/containers/ModelPageOld/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/containers/Form/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/ContentHeader/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/AttributeCard/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/AttributeRow/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/InputCheckboxWithNestedInputs/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/List/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/PluginLeftMenu/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/PluginLeftMenuLink/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/PluginLeftMenuSection/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/PopUpForm/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/PopUpHeaderNavLink/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/PopUpRelations/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/RelationBox/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/RelationIco/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/RelationNaturePicker/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/TableList/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/TableListRow/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/containers/Form/utils/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/utils/*.js',
    // 'packages/strapi-plugin-**/**/admin/src/**/**/*.{js,jsx}',
    '!packages/strapi-admin/admin/src/*.{js,jsx}',
    '!packages/strapi-plugin-**/**/admin/src/*.{js,jsx}',
    '!packages/strapi-admin/admin/src/**/**/tests/*.test.{js,jsx}',
    '!packages/strapi-plugin-*/admin/src/**/**/tests/*.test.{js,jsx}',
  ],
  coverageThreshold: {
    global: {
      // NOTE: This should be increased at some point
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  globals: {
    __webpack_public_path__: 'http://localhost:4000',
    strapi: {},
  },
  // NOTE: Should be dynamic
  moduleDirectories: [
    'node_modules',
    // '<rootDir>/packages/strapi-admin/admin/src',
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
