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
    // Shared contracts are type-only; back/CJS config cannot parse them (same as @strapi/admin).
    'shared/**/*',
  ],
  overrides: [
    {
      files: ['**/*'],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
