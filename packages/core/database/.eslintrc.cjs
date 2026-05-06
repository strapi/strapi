// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    'node_modules/',
    '.eslintrc.cjs',
    'jest.config.js',
    'dist/',
    'rollup.config.mjs',
    'coverage/',
  ],
};

module.exports = config;
