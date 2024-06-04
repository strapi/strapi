module.exports = {
  root: true,
  extends: ['@strapi/eslint-config/front/typescript'],
  overrides: [
    {
      files: ['**/*.test.[j|t]s', '**/*.test.[j|t]sx', '**/__mocks__/**/*'],
      env: {
        jest: true,
      },
    },
    {
      files: ['**/*.js', '**/*.jsx'],
      rules: {
        /**
         * This is useful to have for JS files, it's overwritten
         * by `plugin:@typescript-eslint/recommended` for TS files.
         */
        'no-undef': 'error',
      },
    },
  ],
  globals: {
    process: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    /**
     * This causes problems with PropTypes, once we've removed PropTypes
     * we can remove this rule back to the recommended setting.
     */
    'import/no-named-as-default-member': 'off',
    'import/no-extraneous-dependencies': 'error',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'lodash',
            message: 'Please use import [method] from lodash/[method]',
          },
        ],
      },
    ],
    'no-restricted-globals': [
      'error',
      {
        name: 'strapi',
        message: 'Use window.strapi instead.',
      },
    ],
    'react/display-name': 'off',
  },
};
