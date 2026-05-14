// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back'],
  ignorePatterns: ['node_modules/', '.eslintrc.cjs', 'dist/'],
  overrides: [
    {
      files: ['__tests__/**/*.js'],
      rules: {
        'import/no-unresolved': 'off',
        'import/extensions': 'off',
        'node/no-missing-require': 'off',
      },
    },
  ],
};

module.exports = config;
