// @ts-check

/** @import { Linter } from 'eslint' */

// Resolved from the root `node_modules`, where every ESLint config and plugin this repository
// uses is declared — the same hoisting `extends: '@strapi/eslint-config/front/javascript'` below
// already relies on. ESLint 8 resolves shareable configs and plugins relative to the end-user
// config, so lint dependencies live at the root rather than per workspace.
const { rules: airbnbStyleRules } = require('eslint-config-airbnb-base/rules/style');

const { lodashImportPatterns, lodashSelectors } = require('lint-policy/lodash');

/** @type {Linter.Config} */
const config = {
  parser: '@babel/eslint-parser',
  extends: ['@strapi/eslint-config/front/javascript'],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
  },
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  },
  globals: {
    window: false,
    // TODO: put all this in process.env in webpack to avoid having to set them here
    ADMIN_PATH: true,
    BACKEND_URL: true,
    PUBLIC_PATH: true,
    NODE_ENV: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'prettier/prettier': 'off',
    'react/jsx-no-constructed-context-values': 'warn',
    'react/jsx-no-useless-fragment': 'warn',
    'react/no-unstable-nested-components': 'warn',
    'import/order': [
      'error',
      {
        groups: [
          ['external', 'internal', 'builtin'],
          'parent',
          ['sibling', 'index'],
          'object',
          'type',
        ],
        pathGroups: [{ pattern: 'react', group: 'external', position: 'before' }],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'lodash',
            message: 'Please use import [method] from lodash/[method]',
          },
        ],
        patterns: [...lodashImportPatterns],
      },
    ],
    /**
     * ESLint replaces rule options rather than merging them, so the entries inherited from
     * `airbnb` (via `@strapi/eslint-config/front/javascript`) have to be re-supplied here or they
     * are dropped. They are read from airbnb's own module rather than copied, so they stay in step
     * with the version resolved at lint time. `back` sets this rule to `off` upstream and
     * `front/typescript` never extends airbnb, so this entrypoint is the only one with inherited
     * entries to preserve.
     *
     * The `typeof` filter drops airbnb's leading severity string.
     */
    'no-restricted-syntax': [
      'error',
      ...airbnbStyleRules['no-restricted-syntax'].filter((entry) => typeof entry === 'object'),
      ...lodashSelectors,
    ],
    'no-restricted-globals': [
      'error',
      {
        name: 'strapi',
        message: 'Use window.strapi instead.',
      },
    ],
  },
};

module.exports = config;
