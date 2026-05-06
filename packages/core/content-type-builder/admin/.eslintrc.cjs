// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  env: { es6: true },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['eslint-config-custom/front/typescript'],
    },
  ],
};

module.exports = config;
