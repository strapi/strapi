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
    // The shared lint config targets old Node versions; the repo requires Node >= 22.
    'node/no-unsupported-features/node-builtins': 'off',
  },
  ignorePatterns: ['node_modules/', '.eslintrc.cjs', 'lint-staged.config.mjs'],
};

module.exports = config;
