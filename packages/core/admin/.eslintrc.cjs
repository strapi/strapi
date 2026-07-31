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
    // ee/server has no TS eslint project (#26699); back/CJS config can't parse these.
    'ee/server/**/*',
  ],
  overrides: [
    {
      files: ['**/*'],
      excludedFiles: ['admin/**/*', 'ee/admin/**/*', 'server/**/*', 'shared/**/*'],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
