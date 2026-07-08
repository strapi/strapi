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
    'no-irregular-whitespace': 'warn',
    'node/no-extraneous-import': 'off',
    'import/no-extraneous-dependencies': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'import/order': 'warn',
  },
};

module.exports = config;
