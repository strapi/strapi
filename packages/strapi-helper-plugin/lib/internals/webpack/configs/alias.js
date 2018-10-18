/**
 * Create Alias for webpack config.
 */
const path = require('path');
const paths = require('./paths');

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

/**
 * Libraries common for PROD and DEV.
 * Insert Here a new library, if you want create an alias for PROD and DEV.
 */
const commonLibrary = ['babel-polyfill', 'lodash', 'immutable', 'react-intl', 'react', 'react-dnd', 'react-dnd-html5-backend', 'react-dom', 'react-transition-group', 'reactstrap', 'styled-components'];

// Alias common for PROD and DEV.
const COMMON_ALIAS = createAlias(commonLibrary);


module.exports = { COMMON_ALIAS };
