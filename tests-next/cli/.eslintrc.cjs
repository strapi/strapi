// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Private test workspace: every dependency is a devDependency.
    'node/no-unpublished-import': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  },
  ignorePatterns: ['node_modules/', '.eslintrc.cjs', 'jest.config.js'],
};

module.exports = config;
