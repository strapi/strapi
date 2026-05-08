// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: ['.eslintrc.cjs'],
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      extends: ['eslint-config-custom/front'],
      rules: {
        'import/extensions': 'off',
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['eslint-config-custom/front/typescript'],
    },
    {
      files: ['./tests/*', '**/*.test.*'],
      env: {
        jest: true,
      },
      rules: {
        /**
         * So we can do `import { render } from '@tests/utils'`
         */
        'import/no-unresolved': 'off',
      },
    },
  ],
};

module.exports = config;
