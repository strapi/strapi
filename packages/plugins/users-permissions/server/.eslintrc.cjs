// @ts-check

/** @import { Linter } from 'eslint' */

const { rules: airbnbVariables } = require('eslint-config-airbnb-base/rules/variables');
const { rules: airbnbBestPractices } = require('eslint-config-airbnb-base/rules/best-practices');

/** @type {Linter.Config} */
module.exports = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  rules: {
    // ESLint replaces rule option arrays, so keep the inherited Airbnb entries explicitly.
    'no-restricted-globals': [
      ...airbnbVariables['no-restricted-globals'],
      { name: 'strapi', message: 'Inject the Strapi instance.' },
    ],
    'no-restricted-properties': [
      ...airbnbBestPractices['no-restricted-properties'],
      { object: 'global', property: 'strapi', message: 'Inject the Strapi instance.' },
      { object: 'globalThis', property: 'strapi', message: 'Inject the Strapi instance.' },
    ],
  },
};
