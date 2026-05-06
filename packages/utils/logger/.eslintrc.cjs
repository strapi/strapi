// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.eslintrc.cjs',
    'rollup.config.mjs',
  ],
};

module.exports = config;
