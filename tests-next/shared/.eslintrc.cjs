// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['node_modules/', '.eslintrc.cjs'],
  overrides: [
    {
      // CommonJS entry points run with plain Node (see src/app/generate-app.cjs).
      files: ['*.cjs'],
      rules: { '@typescript-eslint/no-var-requires': 'off' },
    },
  ],
};

module.exports = config;
