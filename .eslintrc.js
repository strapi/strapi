module.exports = {
  parser: 'babel-eslint',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:redux-saga/recommended',

    'prettier',
  ],
  plugins: ['react', 'redux-saga', 'react-hooks', 'import'],
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
    'require-atomic-updates': 0,
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  settings: {
    react: {
      version: '16.5.2',
    },
  },
  overrides: [
    {
      files: ['packages/**/admin/src/**/**/*.js'],
      rules: {
        'no-nested-ternary': ['error'],
        'import/order': 2,
      },
    },
  ],
};
