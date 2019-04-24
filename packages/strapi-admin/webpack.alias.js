const path = require('path');
const pkg = require('./package.json');

const alias = [
  'object-assign',
  'whatwg-fetch',
  '@babel/polyfill',
  'classnames',
  // 'codemirror',
  // 'crypto',
  'history',
  'hoist-non-react-statics',
  'immutable',
  // 'intl',
  'invariant',
  'moment',
  // 'prop-types',
  'react',
  'react-copy-to-clipboard',
  // 'react-datetime',
  'react-dnd',
  'react-dnd-html5-backend',
  'react-dom',
  'react-ga',
  'react-helmet',
  // 'react-intl',
  'react-loadable',
  'react-redux',
  'react-router',
  'react-router-dom',
  // 'react-select',
  'react-transition-group',
  'reactstrap',
  'redux',
  'redux-immutable',
  // 'redux-saga',
  'remove-markdown',
  'reselect',
  // 'strapi-helper-plugin',
  'styled-components',
  // 'video-react',
];

// module.exports = {};

module.exports = alias.reduce((acc, curr) => {
  acc[curr] = require.resolve(curr);

  return acc;
}, {});
