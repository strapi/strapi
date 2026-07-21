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
    // ee/server has no TS eslint project (#26699); back/CJS config can't parse these.
    'ee/server/**/*',
  ],
  overrides: [
    {
      files: ['**/*'],
      excludedFiles: ['admin/**/*', 'ee/admin/**/*', 'ee/server/**/*', 'server/**/*'],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
