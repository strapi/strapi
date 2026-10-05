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
      excludedFiles: ['admin/**/*', 'server/**/*', '*.ts'],
      extends: ['eslint-config-custom/back'],
    },
    {
      files: ['*.ts'],
      extends: ['eslint-config-custom/back/typescript'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.eslint.json'],
      },
      rules: { 'node/no-unpublished-import': 'off' },
    },
  ],
};

module.exports = config;
