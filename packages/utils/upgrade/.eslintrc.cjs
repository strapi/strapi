// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    'bin',
    'coverage',
    'dist',
    'rollup.config.mjs',
  ],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
  },
};

module.exports = config;
