// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.eslintrc.cjs',
    'rollup.config.mjs',
    'lint-staged.config.mjs',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
};

module.exports = config;
