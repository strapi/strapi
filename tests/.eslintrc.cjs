// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back'],
  ignorePatterns: ['e2e/data/**', '.eslintrc.cjs'],
};

module.exports = config;
