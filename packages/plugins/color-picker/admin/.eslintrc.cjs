// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/front/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
};

module.exports = config;
