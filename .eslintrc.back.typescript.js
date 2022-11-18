'use strict';

module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  /**
   * TODO: this should extend @strapi/eslint-config/typescript but doing so requires configuring parserOption.project, which requires tsconfig.json configuration
   */
  // extends: ['plugin:@typescript-eslint/recommended'],
  globals: {
    strapi: false,
  },
  // Instead of extending (which includes values that interfere with this configuration), only take the rules field
  rules: require('./.eslintrc.back.js').rules,
};
