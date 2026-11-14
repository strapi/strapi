// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
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
      {
        /**
         * `@types/react@19` removes the global `JSX` namespace, it only exists as `React.JSX`.
         * A bare `JSX.Element` also leaks into our published `.d.ts` files, so it would break
         * consumers once they move to v19. We're still on v18, this only stops us adding new
         * usages before that migration. Importing it explicitly works on both versions.
         */
        name: 'JSX',
        message:
          "The global JSX namespace is removed in @types/react@19. Use `import { JSX } from 'react'`.",
      },
    ],
    'react/display-name': 'off',
  },
};

module.exports = config;
