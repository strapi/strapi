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
    'rollup.config.mjs',
    'coverage/',
    'lint-staged.config.mjs',
  ],
  overrides: [
    {
      // Async stack traces only show functions suspended at an await. Keep `return await` on the
      // query path so a database error's stack reaches the code that issued the query.
      files: ['src/entity-manager/**/*.ts', 'src/query/**/*.ts', 'src/index.ts'],
      excludedFiles: ['**/__tests__/**'],
      rules: {
        '@typescript-eslint/return-await': ['error', 'always'],
      },
    },
  ],
};

module.exports = config;
