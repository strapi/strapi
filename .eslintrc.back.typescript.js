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
    // TODO: The following rules from @strapi/eslint-config/typescript are disabled because they require praserOptions.project configuration
    // '@typescript-eslint/dot-notation': 'off',
    // '@typescript-eslint/no-implied-eval': 'off',
    // '@typescript-eslint/no-throw-literal': 'off',
    // '@typescript-eslint/return-await': 'off',
  },
};
