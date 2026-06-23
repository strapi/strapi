// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    '.eslintrc.cjs',
    'bin',
    'coverage/',
    'dist',
    'rollup.config.mjs',
    'jest.config.js',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
  },
};

module.exports = config;
