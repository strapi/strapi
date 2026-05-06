// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: {
    project: ['./server/tsconfig.eslint.json'],
  },
  rules: {
    'import/no-cycle': 'warn',
  },
};

module.exports = config;
