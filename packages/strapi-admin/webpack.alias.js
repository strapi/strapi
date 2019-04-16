const path = require('path');
const pkg = require('./package.json');

const alias = Object.keys(pkg.dependencies).concat([
  'object-assign',
  'whatwg-fetch',
]);

module.exports = alias.reduce((acc, curr) => {
  acc[curr] = path.resolve(__dirname, 'node_modules', curr);

  return acc;
}, {});
