// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['node_modules/', '.eslintrc.cjs', 'dist/', 'lint-staged.config.mjs'],
  rules: {
    // Node's type stripping resolves relative specifiers verbatim, so `.ts` extensions are required.
    'import/extensions': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    // The bundler and the test runner are build-time only, so they belong in devDependencies.
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['scripts/**', '__tests__/**'] },
    ],
    // `LOG_FORMAT` reads far better as a joined list than as a template literal.
    'prefer-template': 'off',
  },
};

module.exports = config;
