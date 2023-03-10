module.exports = {
  parser: '@babel/eslint-parser',
  extends: ['@strapi/eslint-config/front'],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    mocha: true,
  },
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  },
  globals: {
    strapi: false,
    window: false,
    cy: false,
    Cypress: false,
    expect: false,
    assert: false,
    chai: false,
    ENABLED_EE_FEATURES: false,
    // TODO: put all this in process.env in webpack to avoid having to set them here
    ADMIN_PATH: true,
    BACKEND_URL: true,
    PUBLIC_PATH: true,
    NODE_ENV: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/jsx-no-constructed-context-values': 'warn',
    'react/jsx-no-useless-fragment': 'warn',
    'react/no-unstable-nested-components': 'warn',
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
  },
};
