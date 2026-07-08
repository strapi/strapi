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
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unsafe-optional-chaining': 'warn',
    'import/order': 'warn',
    'import/first': 'warn',
  },
};

module.exports = config;
