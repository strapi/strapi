const path = require('path');

module.exports = {
  root: true,
  // TODO: create a front typescript config in eslint-config and use it here
  extends: [
    'airbnb-typescript/base',
    '../front',
    'plugin:@typescript-eslint/recommended',
    /*'plugin:@typescript-eslint/recommended-requiring-type-checking'*/
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
  },
  rules: {
    'react/jsx-filename-extension': [
      1,
      {
        extensions: ['tsx'],
      },
    ],
    'import/extensions': 'off',
  },
};
