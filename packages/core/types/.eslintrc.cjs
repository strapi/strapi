// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    'node_modules/',
    '.eslintrc.cjs',
    'dist/',
    'jest.config.js',
    'index.js',
    'rollup.config.mjs',
    'globals-server.d.ts',
  ],
};

module.exports = config;
