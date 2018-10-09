const path = require('path');
const appPath = require('./appPath')
const { __IS_ADMIN__, __INIT_CWD__, __IS_MONOREPO__, __PROD__,  __PWD__} = require('./globals');

const isSetup = __PROD__ ?  __IS_MONOREPO__ :  path.resolve(__PWD__, '..', '..') === path.resolve(__INIT_CWD__);

const rootAdminpath = (() => {
  if (isSetup) {
    return __IS_ADMIN__
      ? path.resolve(appPath, 'strapi-admin')
      : path.resolve(appPath, 'packages', 'strapi-admin');
  }
  return path.resolve(appPath, 'admin');
})();

module.exports = rootAdminpath;
