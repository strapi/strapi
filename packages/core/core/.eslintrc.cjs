// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    'node_modules/',
    '.eslintrc.cjs',
    'jest.config.js',
    'dist/',
    'scripts/',
    'rollup.config.mjs',
    'coverage/',
    'lint-staged.config.mjs',
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
