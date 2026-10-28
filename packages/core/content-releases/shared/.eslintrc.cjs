// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
  },
  overrides: [
    {
      // Contract files use declare namespace + empty object request shapes by convention.
      files: ['contracts/**'],
      rules: {
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/naming-convention': 'off',
        'node/no-extraneous-import': 'off',
      },
    },
  ],
};

module.exports = config;
