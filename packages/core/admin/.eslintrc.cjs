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
  ],
  overrides: [
    {
      files: ['**/*'],
      excludedFiles: [
        'admin/**/*',
        'ee/admin/**/*',
        'server/**/*',
        'shared/**/*',
        'ee/server/**/*',
      ],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
