// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    'node_modules/',
    '.eslintrc.cjs',
    'dist/',
    'bin/',
    'jest.config.js',
    'rollup.config.mjs',
    'coverage/',
  ],
};

module.exports = config;
