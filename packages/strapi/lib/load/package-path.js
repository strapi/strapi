const path = require('path');

module.exports = moduleName =>
  path.dirname(require.resolve(`${moduleName}/package.json`));
