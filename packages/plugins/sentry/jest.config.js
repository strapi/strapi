'use strict';

const pkg = require('./package.json');

module.exports = {
  preset: '../../../jest.base-config.js',
  displayName: (pkg.strapi && pkg.strapi.name) || pkg.name,
  roots: [__dirname],
};
