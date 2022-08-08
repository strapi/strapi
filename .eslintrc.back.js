'use strict';

module.exports = {
  extends: '@strapi/eslint-config/back',
  globals: {
    strapi: false,
  },
  rules: {
    'node/no-unpublished-require': 'off',
    'no-process-exit': 'off',
    'node/exports-style': ['error', 'module.exports'],
    'node/no-new-require': 'error',
    'node/no-path-concat': 'error',
    'node/no-callback-literal': 'error',
    'node/handle-callback-err': 'error',
  },
};
