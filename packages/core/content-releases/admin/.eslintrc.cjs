// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/front/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  overrides: [
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
