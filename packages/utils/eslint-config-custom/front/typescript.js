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
  ],
  globals: {
    process: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    /**
     * This is useful to have for JS files, it's overwritten
     * by `plugin:@typescript-eslint/recommended` for TS files.
     */
    'no-undef': 'error',
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
            name: '@strapi/design-system',
            importNames: ['Stack'],
            message:
              "'Stack' has been deprecated. Please import 'Flex' from '@strapi/design-system' instead.",
          },
          {
            name: '@strapi/helper-plugin',
            importNames: ['request'],
            message:
              "'request' has been deprecated. Please import 'useFetchClient' from '@strapi/helper-plugin' instead.",
          },
          {
            name: '@strapi/helper-plugin',
            importNames: ['ReactSelect'],
            message:
              "'ReactSelect' has been deprecated. You should use the components from '@strapi/design-system' instead.",
          },
          {
            name: 'lodash',
            message: 'Please use import [method] from lodash/[method]',
          },
        ],
        patterns: [
          {
            group: [
              '@strapi/design-system/*',
              '!@strapi/design-system/v2',
              '@strapi/design-system/v2/*',
            ],
            message: 'Please use the default import from "@strapi/design-system" packages instead.',
          },
          {
            group: ['@strapi/icons/*'],
            message: 'Please use the default import from "@strapi/icons" packages instead.',
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
