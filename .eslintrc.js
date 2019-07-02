module.exports = {
  parser: 'babel-eslint',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:redux-saga/recommended',
    'prettier',
  ],
  plugins: ['react', 'redux-saga'],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
    jest: true,
    mocha: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
  },
  // all readonly
  globals: {
    strapi: false,
    window: false,
    cy: false,
    Cypress: false,
    expect: false,
    assert: false,
    chai: false,
    // TODO: put all this in process.env in webpack to avoid having to set them here
    REMOTE_URL: true,
    BACKEND_URL: true,
    PUBLIC_PATH: true,
    MODE: true,
    NODE_ENV: true,
  },
  rules: {
    'generator-star-spacing': 0,
    'no-console': 0,
  },
  settings: {
    react: {
      version: '16.5.2',
    },
  },
  overrides: [
    {
      files: ['**/admin/**', '**/strapi-helper-plugin/**'],
      rules: {
        'redux-saga/no-unhandled-errors': 1,
        'react/no-unescaped-entities': 1,
        'react/prop-types': 2,
        'react/jsx-no-target-blank': 1,
        'react/no-direct-mutation-state': 2,
        'react/display-name': 1,
        'react/jsx-no-target-blank': 1,
        'no-unused-vars': 2,
        'no-undef': 2,
        'no-dupe-keys': 2,
        'no-irregular-whitespace': 1,
      },
    },
  ],
};
