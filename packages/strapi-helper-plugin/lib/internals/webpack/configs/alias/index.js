/**
 * Create Alias for webpack config.
 */
const path = require('path');
const paths = require('../paths');
const dependencies = require('./dependencies.json');

// Create Object for alias path.
const createAlias = libraries => libraries.reduce((acc, item) => {
  acc[item] = path.resolve(
    paths.rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    item,
  );
  return acc;
}, { moment: 'moment/moment.js' });

// Alias common for PROD and DEV.
const COMMON_ALIAS = createAlias(dependencies.base);

module.exports = { COMMON_ALIAS };
