module.exports = {
  collectCoverageFrom: [
    'packages/strapi-admin/admin/src/**/**/*.js',
    '!packages/strapi-admin/admin/src/*.js',
    '!packages/strapi-admin/admin/src/utils/*.js',
    'packages/strapi-plugin-*/admin/src/**/**/*.js',
    'packages/strapi-plugin-*/admin/src/InjectedComponents/tests/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/TableList/*.js',
    '!packages/strapi-plugin-content-type-builder/admin/src/components/TableListRow/*.js',
    '!packages/strapi-plugin-*/admin/src/utils/*.js',
    '!packages/strapi-plugin-*/admin/src/lifecycles/*.js',
    '!packages/strapi-plugin-*/admin/src/**/**/tests/*.test.{js,jsx}',
  ],
  globals: {
    __webpack_public_path__: 'http://localhost:4000',
    strapi: {},
    BACKEND_URL: 'http://localhost:1337',
    MODE: 'host',
    PUBLIC_PATH: '/admin',
    REMOTE_URL: '/',
    NODE_ENV: 'test',
  },
  moduleDirectories: [
    'node_modules',
    '<rootDir>/packages/strapi-admin/node_modules',
    '<rootDir>/test/config/front',
  ],
  moduleNameMapper: {
    '.*\\.(css|less|styl|scss|sass)$':
      '<rootDir>/test/config/front/mocks/cssModule.js',
    '.*\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/test/config/front/mocks/image.js',
  },
  rootDir: process.cwd(),
  setupFilesAfterEnv: ['<rootDir>/test/config/front/test-bundler.js'],
  setupFiles: [
    '<rootDir>/test/config/front/enzyme-setup.js',
    '<rootDir>/test/config/front/strapi.js',
  ],
  testRegex: 'tests/.*\\.test\\.js$',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/fileTransformer.js',
  },
  testURL: 'http://localhost:4000/admin',
};
