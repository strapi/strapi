// @ts-check

const path = require('path');

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
    {
      files: ['ee/server/src/controllers/authentication-utils/**/*'],
      extends: ['eslint-config-custom/back/typescript'],
      parserOptions: {
        tsconfigRootDir: path.join(__dirname, 'ee/server'),
        project: ['./tsconfig.eslint.json'],
      },
    },
  ],
};

module.exports = config;
