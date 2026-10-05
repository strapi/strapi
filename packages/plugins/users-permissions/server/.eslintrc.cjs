// @ts-check

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
  },
  rules: {
    'no-restricted-globals': ['error', { name: 'strapi', message: 'Inject the Strapi instance.' }],
    'no-restricted-properties': [
      'error',
      { object: 'global', property: 'strapi', message: 'Inject the Strapi instance.' },
      { object: 'globalThis', property: 'strapi', message: 'Inject the Strapi instance.' },
    ],
  },
};
