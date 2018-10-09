/**
 * Create Alias for webpack config.
 */
const path = require('path');
const rootAdminpath =  require('./rootAdminpath');

// Create Object for alias path.
const createAlias = libraries => libraries.reduce((acc, item) => {
  acc[item] = path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    item,
  )
  return acc
}, {})

/**
 * Libraries common for PROD and DEV.
 * Insert Here a new library, if you create an alias for PROD and DEV.
 */
const commonLibrary = ['babel-polyfill', 'lodash', 'immutable', 'react-intl', 'react', 'react-dom', 'react-transition-group', 'reactstrap', 'styled-components']

/**
 * Libraries for DEV.
 * Insert Here a new library, if you create an alias DEV.
 */
const devLibrary = ['react-dnd', 'react-dnd-html5-backend']

// COMMON Alias for PROD and DEV.
const COMMON_ALIAS = createAlias(commonLibrary)

// Alias for PROD (contains COMMON_ALIAS).
const PROD_ALIAS = {
  ...COMMON_ALIAS,
  moment: 'moment/moment.js',
};

// Alias for DEV (contains COMMON_ALIAS).
const DEV_ALIAS = {
  ...COMMON_ALIAS,
  moment: 'moment/moment.js',
  ...createAlias(devLibrary)
};

module.exports = { PROD_ALIAS, DEV_ALIAS };
