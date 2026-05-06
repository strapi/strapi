// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: [
    'node_modules/',
    '.eslintrc.cjs',
    'jest.config.js',
    'dist/',
    'scripts/',
    'coverage/',
    'rollup.config.mjs',
  ],
  overrides: [
    {
      files: ['**/*.test.ts'],
      rules: {
        'import/no-relative-packages': 'warn',
      },
    },
  ],
};

module.exports = config;
