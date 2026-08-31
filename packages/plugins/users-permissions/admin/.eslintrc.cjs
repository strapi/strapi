// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/front/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
  },

  rules: {
    // TODO: Remove this when all files are migrated to TypeScript
    '@typescript-eslint/ban-ts-comment': 'off',

    'import/no-default-export': 'off',
    'check-file/no-index': 'off',
    'check-file/filename-naming-convention': 'off',
  },
};

module.exports = config;
