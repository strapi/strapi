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
      },
    },
  ],
};

module.exports = config;
