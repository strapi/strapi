// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/front/typescript'],
  overrides: [
    {
      files: ['**/*'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
};

module.exports = config;
