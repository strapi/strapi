module.exports = {
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:node/recommended',
  ],
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  globals: {
    strapi: false,
  },
  rules: {
    'node/no-unpublished-require': 'off',
    'require-atomic-updates': 'off',
    'no-process-exit': 'off',
    strict: ['error', 'global'],
    'import/order': 'error',
  },
};
