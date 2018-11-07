const fs = require('fs');
const _ = require('lodash');
const path = require('path');

const { __APP_PATH__, __IS_ADMIN__, __IS_MONOREPO__, __NODE_ENV__ ,  __PWD__} = require('./globals');

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
const appPath = __APP_PATH__ || path.resolve(__PWD__, '..', ( __IS_ADMIN__ ? '' : '..' ));

// Path bis 'admin' from our application.
const appPathAdmin = path.resolve(appPath, 'admin');

// Path bis 'strapi-admin' in our application.
const strapiAdmin = __IS_ADMIN__ ? path.resolve(appPath, 'strapi-admin') : path.resolve(appPath, 'packages', 'strapi-admin');

/**
 * rootAdminpath : Path of admin in main directory of application.
 * For example : 
 *   - build from monorepository : appPath = 'path/strapi/packages/strapi-admin'
 *   - build in app dev : appPath = `path/${nameProject}/admin`
 */
const rootAdminpath =  __IS_MONOREPO__ ? strapiAdmin : appPathAdmin;

const adminPath = __IS_ADMIN__ && __IS_MONOREPO__ ? strapiAdmin : path.resolve(__PWD__);

const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

module.exports = {
  adminPath: adminPath,
  appPathAdmin: appPathAdmin,
  appIndexJs: resolveApp('src/index.js'),
  appPath: appPath,
  filepath: path.resolve(__dirname, 'dist/*.dll.js'),
  indexHtml: path.resolve(appPath, 'admin', 'admin', 'src', 'index.html'),
  manifestJson: path.resolve(rootAdminpath, 'admin', 'src', 'config', 'manifest.json'),
  packageJson: path.resolve(process.cwd(), 'package.json'),
  pwd: path.resolve(__PWD__),
  postcssConfig: path.resolve(__dirname, '..', '..', 'postcss', 'postcss.config.js'),
  rootAdminpath: rootAdminpath,
  serverJson :  path.resolve(
    appPath,
    'config',
    'environments',
    _.lowerCase(__NODE_ENV__),
    'server.json',
  ),
};
