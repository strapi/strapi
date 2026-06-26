// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: ['.eslintrc.cjs'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['eslint-config-custom/front/typescript'],
      // parserOptions: {
      //   tsconfigRootDir: __dirname,
      // },
      // settings: {
      //   'import/resolver': {
      //     typescript: true,
      //     node: true,
      //   },
      // },
      rules: {
        'check-file/filename-naming-convention': 'off',
      },
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
        'check-file/folder-match-with-fex': [
          'error',
          {
            '*.test.{js,jsx,ts,tsx}': '**/{__tests__,tests}/**',
          },
        ],
      },
    },
  ],
};

module.exports = config;
