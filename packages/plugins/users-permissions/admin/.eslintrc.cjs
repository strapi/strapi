// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ['.eslintrc.cjs'],
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      extends: ['eslint-config-custom/front'],
      rules: { 'import/extensions': 'off' },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['eslint-config-custom/front/typescript'],
      parserOptions: { tsconfigRootDir: __dirname, project: ['./tsconfig.json'] },
    },
  ],
};
