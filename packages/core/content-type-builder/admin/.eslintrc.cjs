// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: ['.eslintrc.cjs'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['eslint-config-custom/front/typescript'],
    },
  ],
};

module.exports = config;
