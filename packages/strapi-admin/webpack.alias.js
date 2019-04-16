const path = require('path');
const alias = [
  'core-js',
  'create-react-context',
  'invariant',
  'hoist-non-react-statics',
  'object-assign',
  'react-popper',
  'reactstrap',
  'whatwg-fetch',
];

module.exports = alias.reduce((acc, curr) => {
  acc[curr] = path.resolve(__dirname, 'node_modules', curr);

  return acc;
}, {});
