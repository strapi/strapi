// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back'],
  ignorePatterns: ['node_modules/', '.eslintrc.cjs', 'dist/', 'lint-staged.config.mjs'],
};

module.exports = config;
