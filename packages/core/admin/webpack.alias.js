'use strict';

const path = require('path');
const findRoot = require('find-root');

const aliasExactMatch = [
  '@strapi/design-system',
  '@strapi/helper-plugin',
  '@strapi/icons',
  'date-fns',
  'formik',
  'history',
  'immer',
  'qs',
  'lodash',
  'react',
  'react-copy-to-clipboard',
  'react-dnd',
  'react-dnd-html5-backend',
  'react-dom',
  'react-error-boundary',
  'react-fast-compare',
  'react-helmet',
  'react-is',
  'react-intl',
  'react-query',
  'react-redux',
  'react-router',
  'react-router-dom',
  'react-window',
  'react-select',
  'redux',
  'reselect',
  'styled-components',
  'yup',
];

// See https://webpack.js.org/configuration/resolve/
module.exports = {
  ...aliasExactMatch.reduce((acc, moduleName) => {
    acc[`${moduleName}$`] = findRoot(require.resolve(moduleName));
    return acc;
  }, {}),

  ee_else_ce: path.resolve(__dirname),
};
