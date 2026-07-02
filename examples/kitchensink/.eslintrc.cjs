// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  parser: '@babel/eslint-parser',
  extends: 'eslint:recommended',
  ignorePatterns: [
    '.cache',
    '.eslintrc.cjs',
    'build',
    '**/node_modules/**',
    'lint-staged.config.mjs',
  ],
  env: {
    commonjs: true,
    es6: true,
    node: true,
    browser: false,
  },
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: false,
    },
    sourceType: 'module',
    requireConfigFile: false,
  },
  globals: {
    strapi: true,
  },
  rules: {
    indent: ['error', 2, { SwitchCase: 1 }],
    'linebreak-style': ['error', 'unix'],
    'no-console': 0,
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
  },
};

module.exports = config;
