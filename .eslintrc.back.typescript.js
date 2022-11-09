'use strict';

module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  /**
   * TODO: this should extend @strapi/eslint-config but doing so requires configuring parserOption.project, which requires tsconfig.json configuration
   */
  // extends: ['plugin:@typescript-eslint/recommended'],
  globals: {
    strapi: false,
  },
  rules: {
    // 'import/no-dynamic-require': 'off',
    // 'global-require': 'off',
    // 'import/no-extraneous-dependencies': [
    //   'error',
    //   {
    //     devDependencies: [
    //       'packages/admin-test-utils/**/*.js',
    //       'packages/generators/admin/**/*.js',
    //       'scripts/**/*.js',
    //       '**/test/**/*.js',
    //       '**/tests/**/*.js',
    //       '**/__tests__/**/*.js',
    //       '**/__mocks__/**/*.js',
    //     ],
    //   },
    // ],
    // 'prefer-destructuring': ['error', { AssignmentExpression: { array: false } }],
    // 'no-underscore-dangle': 'off',
    // 'no-use-before-define': 'off',
    // 'no-continue': 'warn',
    // 'no-process-exit': 'off',
    // 'no-loop-func': 'off',
    // 'no-param-reassign': [
    //   'error',
    //   {
    //     props: false,
    //   },
    // ],
  },
};
