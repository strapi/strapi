// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: [
    'dist',
    'rollup.config.mjs',
    '.eslintrc.cjs'
  ],
  overrides: [
    {
      files: ['**'],
      excludedFiles: ['admin/**/*', 'server/**/*'],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
