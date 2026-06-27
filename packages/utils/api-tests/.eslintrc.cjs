// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back'],
  ignorePatterns: [
    'node_modules/',
    '.eslintrc.cjs',
    'coverage/',
    '**/*',
    '!__tests__/**',
    '!jest.config.js',
  ],
};

module.exports = config;
