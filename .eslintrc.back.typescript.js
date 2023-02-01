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
  rules: {
    // Instead of extending (which includes values that interfere with this configuration), only take the rules field
    ...require('./.eslintrc.back.js').rules,
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.ts'] }],
    // TODO: The following rules from @strapi/eslint-config/typescript are disabled because they're causing problems we need to solve or fix
    // to be solved in configuration
    'node/no-unsupported-features/es-syntax': 'off',
    'import/prefer-default-export': 'off',
    'node/no-missing-import': 'off',
    '@typescript-eslint/brace-style': 'off', // TODO: fix conflict with prettier/prettier in data-transfer/engine/index.ts
    // to be cleaned up throughout codebase (too many to fix at the moment)
    '@typescript-eslint/no-use-before-define': 'warn',
    '@typescript-eslint/comma-dangle': 'off',
  },
  // Disable only for tests
  overrides: [
    {
      files: ['**.test.ts'],
      rules: {
        '@typescript-eslint/ban-ts-comment': 'warn', // as long as javascript is allowed in our codebase, we want to test erroneous typescript usage
      },
    },
  ],
};
