// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Private test workspace: every dependency is a devDependency.
    'node/no-unpublished-import': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  },
  overrides: [
    {
      // No-code E2E scripts: plain ESM run by Node >= 22, where import paths need their extension.
      files: ['no-code-e2e/scripts/**/*.mjs'],
      rules: {
        'import/extensions': ['error', 'ignorePackages'],
        'node/no-unsupported-features/node-builtins': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    '.eslintrc.cjs',
    'lint-staged.config.mjs',
    'test-results/',
    'playwright-report/',
  ],
};

module.exports = config;
