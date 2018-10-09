const path = require('path');
const { __APP_PATH__, __IS_ADMIN__, __PWD__ } = require('./globals');

const appPath = (() => {
  if (__APP_PATH__) {
    return __APP_PATH__;
  }
  
  return __IS_ADMIN__ ? path.resolve(__PWD__, '..') : path.resolve(__PWD__, '..', '..');
})();

module.exports = appPath;
