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
    'vitest.config.ts',
    'dist/',
    'coverage/',
    'rollup.config.mjs',
  ],
  rules: {
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/test/**/*.js',
          '**/test/**/*.ts',
          '**/tests/**/*.js',
          '**/tests/**/*.ts',
          '**/__tests__/**/*.js',
          '**/__tests__/**/*.ts',
          '**/__mocks__/**/*.js',
          '**/__mocks__/**/*.ts',
          '**/*.test.ts',
        ],
        packageDir: __dirname,
      },
    ],
  },
};

module.exports = config;
