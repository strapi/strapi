'use strict';

module.exports = {
  extends: '@strapi/eslint-config/back',
  globals: {
    strapi: false,
  },
  rules: {
    'import/no-dynamic-require': 'off',
    'global-require': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          'packages/admin-test-utils/**/*.js',
          'packages/generators/admin/**/*.js',
          'scripts/**/*.js',
          '**/test/**/*.js',
          '**/tests/**/*.js',
          '**/__tests__/**/*.js',
          '**/__mocks__/**/*.js',
        ],
      },
    ],
    'prefer-destructuring': ['error', { AssignmentExpression: { array: false } }],
    eqeqeq: 'warn',
    'no-underscore-dangle': 'warn',
    'no-use-before-define': 'warn',
    'no-param-reassign': 'warn',
    'no-continue': 'warn',
    'no-process-exit': 'off',
    'no-plusplus': 'warn',
    'no-loop-func': 'warn',
    'guard-for-in': 'warn',
  },
};
