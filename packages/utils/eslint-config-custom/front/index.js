module.exports = {
  parser: '@babel/eslint-parser',
  extends: ['@strapi/eslint-config/front/javascript'],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
  },
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  },
  globals: {
    window: false,
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
    'prettier/prettier': 'off',
    'react/jsx-no-constructed-context-values': 'warn',
    'react/jsx-no-useless-fragment': 'warn',
    'react/no-unstable-nested-components': 'warn',
    'import/order': [
      'error',
      {
        groups: [
          ['external', 'internal', 'builtin'],
          'parent',
          ['sibling', 'index'],
          'object',
          'type',
        ],
        pathGroups: [{ pattern: 'react', group: 'external', position: 'before' }],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
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
  },
};
