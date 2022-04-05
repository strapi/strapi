'use strict';

module.exports = () => ({
  extends: '@strapi/typescript-utils/lib/configs/admin',

  exclude: ['node_modules/', 'build/', 'dist/', '**/*.test.ts'],
});
