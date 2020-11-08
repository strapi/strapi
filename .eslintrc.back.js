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
    'node/no-unpublished-require': 0,
    'require-atomic-updates': 0,
    'no-process-exit': 0,
  },
};
