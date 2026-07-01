// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'rollup.config.mjs',
    'vitest.config.ts',
    'coverage/',
    'lint-staged.config.mjs',
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
