// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: ['.eslintrc.cjs'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['eslint-config-custom/front/typescript'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
};

module.exports = config;
