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
    'templates/',
    'rollup.config.mjs',
  ],
};

module.exports = config;
