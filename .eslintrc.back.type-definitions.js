'use strict';

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint'],
  // TODO: This should be turned on but causes hundreds of violations in .d.ts files throughout Strapi that would need to be fixed
  // extends: ['@strapi/eslint-config/typescript'],
  globals: {
    strapi: false,
  },
  // Instead of extending (which includes values that interfere with this configuration), only take the rules field
  rules: {
    ...require('./.eslintrc.back.js').rules,
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.ts'] }],
  },
};
