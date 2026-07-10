// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'rollup.config.mjs',
    'coverage/',
    'lint-staged.config.mjs',
    'shared/**/*',
  ],
  overrides: [
    {
      files: ['**/*'],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
