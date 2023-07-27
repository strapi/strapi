const path = require('path');

module.exports = {
  root: true,
  extends: [
    '@strapi/eslint-config/typescript' /*'plugin:@typescript-eslint/recommended-requiring-type-checking'*/,
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
  },
  globals: {
    strapi: false,
  },
  rules: {
    ...require('./back').rules,
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    // TODO: The following rules from @strapi/eslint-config/typescript are disabled because they're causing problems we need to solve or fix
    // to be solved in configuration
    'node/no-unsupported-features/es-syntax': 'off',
    'import/prefer-default-export': 'off',
    'node/no-missing-import': 'off',
    '@typescript-eslint/brace-style': 'off', // TODO: fix conflict with prettier/prettier in data-transfer/engine/index.ts
    // to be cleaned up throughout codebase (too many to fix at the moment)
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/comma-dangle': 'off',
    '@typescript-eslint/quotes': 'off',
    '@typescript-eslint/no-shadow': 'off',
  },
  overrides: [
    {
      files: ['**.test.ts'],
      rules: {
        '@typescript-eslint/ban-ts-comment': 'warn', // as long as javascript is allowed in our codebase, we want to test erroneous typescript usage
      },
    },
  ],
};
