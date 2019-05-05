const path = require('path');
const { templateConfiguration } = require('strapi-utils');

/**
 * Requires a file and eval expression if it is a json
 * @param {string} filePath - file path
 */
module.exports = filePath => {
  if (path.extname(filePath) === '.json') {
    return templateConfiguration(require(filePath));
  }
  return require(filePath);
};
