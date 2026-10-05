// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['eslint-config-custom/front/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: { tsconfigRootDir: __dirname, project: ['./tsconfig.json'] },
};
