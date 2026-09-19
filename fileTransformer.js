const path = require('path');

module.exports = {
  /**
   * @param {string} _src
   * @param {string} filename
   */
  process(_src, filename) {
    return 'module.exports = ' + JSON.stringify(path.basename(filename)) + ';';
  },
};
