const alias = [
  'object-assign',
  'whatwg-fetch',
  '@babel/polyfill',
  '@buffetjs/core',
  '@buffetjs/custom',
  '@buffetjs/icons',
  '@buffetjs/styles',
  '@buffetjs/utils',
  '@fortawesome/fontawesome-svg-core',
  '@fortawesome/free-solid-svg-icons',
  'classnames',
  'history',
  'hoist-non-react-statics',
  'immer',
  'immutable',
  'invariant',
  'moment',
  'react',
  'react-copy-to-clipboard',
  'react-dnd',
  'react-dnd-html5-backend',
  'react-dom',
  'react-helmet',
  'react-is',
  'react-intl',
  'react-loadable',
  'react-redux',
  'react-router',
  'react-router-dom',
  'react-transition-group',
  'react-virtualized',
  'reactstrap',
  'react-select',
  'redux',
  'redux-immutable',
  'remove-markdown',
  'reselect',
  'styled-components',
  'yup',
];

module.exports = alias.reduce(
  (acc, curr) => {
    acc[curr] = require.resolve(curr);

    return acc;
  },
  {
    'react-select/animated': require.resolve('react-select/animated'),
    'react-select/async': require.resolve('react-select/async'),
    'react-select/async-creatable': require.resolve('react-select/async-creatable'),
    'react-select/base': require.resolve('react-select/base'),
    'react-select/creatable': require.resolve('react-select/creatable'),
  }
);
