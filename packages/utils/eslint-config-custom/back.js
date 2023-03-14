module.exports = {
  extends: '@strapi/eslint-config/back',
  parserOptions: {
    ecmaVersion: 2021,
  },
  globals: {
    strapi: false,
  },
  rules: {
    'prettier/prettier': 'off',
    'import/no-dynamic-require': 'off',
    'global-require': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/test/**/*.js',
          '**/tests/**/*.js',
          '**/__tests__/**/*.js',
          '**/__mocks__/**/*.js',
        ],
      },
    ],
    'prefer-destructuring': ['error', { AssignmentExpression: { array: false } }],
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'no-continue': 'warn',
    'no-process-exit': 'off',
    'no-loop-func': 'off',
    'max-classes-per-file': 'off',
    'no-param-reassign': [
      'error',
      {
        props: false,
      },
    ],
  },
};
