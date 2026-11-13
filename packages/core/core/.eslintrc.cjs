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
    {
      // Async stack traces only show functions suspended at an await. Keep `return await` in the
      // document service so a database error's stack reaches the service or controller that called it.
      files: ['src/services/document-service/**/*.ts'],
      excludedFiles: ['**/__tests__/**'],
      rules: {
        '@typescript-eslint/return-await': ['error', 'always'],
      },
    },
  ],
};

module.exports = config;
