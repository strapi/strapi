'use strict';

const path = require('path');

const aliasExactMatch = [
  '@strapi/design-system',
  '@strapi/helper-plugin',
  '@strapi/icons',
  '@fortawesome/fontawesome-svg-core',
  '@fortawesome/free-solid-svg-icons',
  'date-fns',
  'formik',
  'history',
  'immer',
  'qs',
  'lodash',
  'moment',
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
  'react-virtualized',
  'react-select',
  'redux',
  'reselect',
  'styled-components',
  'whatwg-fetch',
  'yup',
];

const alias = [
  'react-select/animated',
  'react-select/async',
  'react-select/async-creatable',
  'react-select/base',
  'react-select/creatable',
];

// See https://webpack.js.org/configuration/resolve/
module.exports = {
  ...alias.reduce((acc, name) => {
    acc[name] = require.resolve(name);
    return acc;
  }, {}),

  ...aliasExactMatch.reduce((acc, name) => {
    acc[`${name}$`] = require.resolve(name);
    return acc;
  }, {}),

  ee_else_ce: path.resolve(__dirname),
};
