'use strict';

const path = require('path');

const alias = [
  'object-assign',
  'whatwg-fetch',
  '@fortawesome/fontawesome-svg-core',
  '@fortawesome/free-solid-svg-icons',
  'history',
  'hoist-non-react-statics',
  'immer',
  'invariant',
  'lodash',
  'moment',
  'qs',
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
  'react-redux',
  'react-router',
  'react-router-dom',
  'react-virtualized',
  'react-select',
  'redux',
  'reselect',
  'styled-components',
  'yup',
];

module.exports = alias.reduce(
  (acc, curr) => {
    acc[`${curr}$`] = require.resolve(curr);
    return acc;
  },
  {
    'react-select/animated': require.resolve('react-select/animated'),
    'react-select/async': require.resolve('react-select/async'),
    'react-select/async-creatable': require.resolve('react-select/async-creatable'),
    'react-select/base': require.resolve('react-select/base'),
    'react-select/creatable': require.resolve('react-select/creatable'),
    ee_else_ce: path.resolve(__dirname),
  }
);
