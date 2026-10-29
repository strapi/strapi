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
    // Declarations of the JavaScript entry, type checked by tests/types/registries.
    'types/**/*.d.ts',
  ],
  overrides: [
    {
      files: ['admin/**/*'],
      extends: ['eslint-config-custom/front'],
      rules: {
        'import/extensions': 'off',
      },
    },
    {
      files: ['**/*'],
      excludedFiles: ['admin/**/*'],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
