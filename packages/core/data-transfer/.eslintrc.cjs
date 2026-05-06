// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.eslintrc.cjs',
    'jest.config.js',
    'coverage/',
    'rollup.config.mjs',
  ],
};

module.exports = config;
