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
    // shared has no TS eslint project; back/CJS config can't parse these.
    'shared/**/*',
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
