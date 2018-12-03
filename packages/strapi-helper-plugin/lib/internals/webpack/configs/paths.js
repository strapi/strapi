const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { __APP_PATH__, __IS_ADMIN__, __IS_MONOREPO__, __NODE_ENV__, __PWD__ } = require('./globals');

/**
 * Whole path uses in webpack.
 * const is in this order due of reference, cannot order them in alphabetical order.
 */
const appDirectory = fs.realpathSync(process.cwd());

/**
 * appPath : Path of main directory of application.
 * For example :
 *   - build from monorepository : appPath = 'path/strapi'
 *   - build in app dev : appPath = `path/${nameProject}`
 */
const appPath = __APP_PATH__ || path.resolve(__PWD__, '..', __IS_ADMIN__ ? '' : '..');

// Path bis 'admin' from our application.
const appPathAdmin = path.resolve(appPath, 'admin');

// Path bis 'strapi-admin' in our application.
const strapiAdmin = __IS_ADMIN__
  ? path.resolve(appPath, 'strapi-admin')
  : path.resolve(appPath, 'packages', 'strapi-admin');

/**
 * rootAdminpath : Path of admin in main directory of application.
 * For example :
 *   - build from monorepository : rootAdminpath = 'path/strapi/packages/strapi-admin'
 *   - build in app dev : rootAdminpath = `path/${nameProject}/admin`
 */

const rootAdminpath = __IS_MONOREPO__ ? strapiAdmin : appPathAdmin;

/**
 * For example :
 *   - build from monorepository :
 *          if admin : adminPath = 'path/strapi/packages/strapi-admin'
 *          if !admin : adminPath = 'path/strapi/packages/${namePackage}'
 *   - build in app dev : adminPath = `path/${nameProject}/admin`
 */

const adminPath = __IS_ADMIN__ && __IS_MONOREPO__ ? strapiAdmin : path.resolve(__PWD__);

module.exports = {
  adminPath,
  appDev: path.join(appPath, 'admin', 'admin', 'src', 'appDev.js'),
  appIndexJs: path.resolve(appDirectory, 'src/index.js'),
  appPath,
  appPathAdmin,
  buildPath: path.join(adminPath, 'admin', 'build'),
  filepath: path.resolve(__dirname, 'dist/*.dll.js'),
  indexHtml: path.resolve(appPath, 'admin', 'admin', 'src', 'index.html'),
  manifestJson: path.resolve(rootAdminpath, 'admin', 'src', 'config', 'manifest.json'),
  packageJson: path.resolve(process.cwd(), 'package.json'),
  pwd: path.resolve(__PWD__),
  postcssConfig: path.resolve(__dirname, '..', '..', 'postcss', 'postcss.config.js'),
  rootAdminpath: rootAdminpath,
  serverJson: path.resolve(
    appPath,
    'config',
    'environments',
    _.lowerCase(__NODE_ENV__),
    'server.json',
  ),
};
