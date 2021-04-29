const IS_EE = process.env.IS_EE === 'true';

const moduleNameMapper = {
  '.*\\.(css|less|styl|scss|sass)$': '<rootDir>/test/config/front/mocks/cssModule.js',
  '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ico)$':
    '<rootDir>/test/config/front/mocks/image.js',
  '^ee_else_ce(/.*)$': [
    '<rootDir>/packages/core/admin/admin/src$1',
    '<rootDir>/packages/core/content-manager/admin/src$1',
    '<rootDir>/packages/core/content-type-builder/admin/src$1',
    '<rootDir>/packages/core/upload/admin/src$1',
    '<rootDir>/packages/core/email/admin/src$1',
    '<rootDir>/packages/plugins/*/admin/src$1',
  ],
};

if (IS_EE) {
  const rootDirEE = [
    '<rootDir>/packages/core/admin/ee/admin$1',
    '<rootDir>/packages/core/content-manager/ee/admin/src$1',
    '<rootDir>/packages/core/content-type-builder/ee/admin/src$1',
    '<rootDir>/packages/core/upload/ee/admin/src$1',
    '<rootDir>/packages/core/email/ee/admin/src$1',
    '<rootDir>/packages/plugins/*/ee/admin/src$1',
  ];

  Object.assign(moduleNameMapper, {
    '^ee_else_ce(/.*)$': rootDirEE,
  });
}

module.exports = {
  collectCoverageFrom: [
    // 'packages/strapi-admin/admin/src/**/**/*.js',
    // '!packages/strapi-admin/admin/src/*.js',
    // '!packages/strapi-admin/admin/src/utils/*.js',
    // 'packages/strapi-plugin-*/admin/src/**/**/*.js',
    // 'packages/strapi-plugin-*/admin/src/InjectedComponents/tests/*.js',
    // '!packages/strapi-plugin-content-type-builder/admin/src/components/TableList/*.js',
    // '!packages/strapi-plugin-content-type-builder/admin/src/components/TableListRow/*.js',
    // 'packages/strapi-plugin-*/admin/src/utils/*.js',
    // '!packages/strapi-plugin-*/admin/src/lifecycles/*.js',
    // '!packages/strapi-plugin-*/admin/src/**/**/tests/*.test.{js,jsx}',
  ],
  globals: {
    __webpack_public_path__: 'http://localhost:4000',
    strapi: {
      backendURL: 'http://localhost:1337',
    },
    BACKEND_URL: 'http://localhost:1337',
    MODE: 'host',
    PUBLIC_PATH: '/admin',
    REMOTE_URL: '/',
    NODE_ENV: 'test',
    ENABLED_EE_FEATURES: [],
  },
  moduleDirectories: [
    'node_modules',
    '<rootDir>/packages/strapi-admin/node_modules',
    '<rootDir>/test/config/front',
  ],
  moduleNameMapper,
  rootDir: process.cwd(),
  setupFiles: ['<rootDir>/test/config/front/test-bundler.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/examples/getstarted/',
    '<rootDir>/packages/strapi-helper-plugin/dist/',
    '/OLD/',
    '__tests__',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/config/front/enzyme-setup.js',
    '<rootDir>/test/config/front/strapi.js',
  ],
  testRegex: 'tests/.*\\.test\\.js$',
  transform: {
    '^.+\\.js$': ['@swc-node/jest', { jsx: true, dynamicImport: true }],
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/fileTransformer.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(react-dnd|dnd-core|react-dnd-html5-backend)/)'],
  testURL: 'http://localhost:4000/admin',
};
