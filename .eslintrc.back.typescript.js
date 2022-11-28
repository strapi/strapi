'use strict';

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint'],
  extends: ['@strapi/eslint-config/typescript'],
  globals: {
    strapi: false,
  },
  // Instead of extending (which includes values that interfere with this configuration), only take the rules field
  rules: {
    ...require('./.eslintrc.back.js').rules,
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.ts'] }],
    // TODO: The following rules from @strapi/eslint-config/typescript are disabled because they're causing problems we need to solve or fix
    // to be solved (that is, we want to keep the rule, but it shouldn't be reported in the places it is)
    'node/no-unsupported-features/es-syntax': 'off',
    'import/prefer-default-export': 'off',
    'node/no-missing-import': 'off',
    // to be cleaned up (should be left on and fixed but out of scope right now because it affects many files throughout the codebase)
    '@typescript-eslint/no-use-before-define': 'warn',
    '@typescript-eslint/brace-style': 'off', // TODO: fix conflict with prettier/prettier in data-transfer/engine/index.ts
  },
};
