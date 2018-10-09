/**
 * Create Alias for webpack config.
 */

const path = require('path');
const { __APP_PATH__, __IS_ADMIN__, __INIT_CWD__, __IS_MONOREPO__, __PROD__,  __PWD__} = require('./globals');

const isSetup = __PROD__ ?  __IS_MONOREPO__ :  path.resolve(__PWD__, '..', '..') === path.resolve(__INIT_CWD__);
const appPath = (() => {
  if (__APP_PATH__) {
    return __APP_PATH__;
  }
  return __IS_ADMIN__ ? path.resolve(__PWD__, '..') : path.resolve(__PWD__, '..', '..');
})();
const rootAdminpath = (() => {
  if (isSetup) {
    return __IS_ADMIN__
      ? path.resolve(appPath, 'strapi-admin')
      : path.resolve(appPath, 'packages', 'strapi-admin');
  }
  return path.resolve(appPath, 'admin');
})();

// Alias common for PROD and DEV.
const COMMON_ALIAS = {
  moment: 'moment/moment.js',
  'babel-polyfill': path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'babel-polyfill',
  ),
  lodash: path.resolve(rootAdminpath, 'node_modules', 'strapi-helper-plugin', 'node_modules', 'lodash'),
  immutable: path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'immutable',
  ),
  'react-intl': path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'react-intl',
  ),
  react: path.resolve(rootAdminpath, 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react'),
  'react-dom': path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'react-dom',
  ),
  'react-transition-group': path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'react-transition-group',
  ),
  reactstrap: path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'reactstrap',
  ),
  'styled-components': path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'styled-components',
  ),
};

// Alias for PROD (contains commonAlias).
const PROD_ALIAS = {
  ...COMMON_ALIAS,
};

// Alias for DEV (contains commonAlias).
const DEV_ALIAS = {
  ...COMMON_ALIAS,
  'react-dnd': path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'react-dnd',
  ),
  'react-dnd-html5-backend': path.resolve(
    rootAdminpath,
    'node_modules',
    'strapi-helper-plugin',
    'node_modules',
    'react-dnd-html5-backend',
  ),
};

module.exports = { PROD_ALIAS, DEV_ALIAS };
