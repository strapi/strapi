'use strict';

const path = require('path');

/**
 * Returns the path to a node modules root directory (not the main file path)
 * @param {string} moduleName - name of a node module
 */
module.exports = (moduleName) => path.dirname(require.resolve(`${moduleName}/package.json`));
