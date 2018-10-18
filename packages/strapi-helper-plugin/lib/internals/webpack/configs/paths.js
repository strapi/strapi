const fs = require('fs');
const _ = require('lodash');
const path = require('path');

const { __APP_PATH__, __IS_ADMIN__, __INIT_CWD__, __IS_MONOREPO__, __NODE_ENV__ ,__PROD__,  __PWD__} = require('./globals');

const appDirectory = fs.realpathSync(process.cwd());

// define appPath.
const appPath = __APP_PATH__ || path.resolve(__PWD__, '..', ( __IS_ADMIN__ ? '' : '..' ));


const isSetup = __PROD__ ?  __IS_MONOREPO__ :  path.resolve(__PWD__, '..', '..') === path.resolve(__INIT_CWD__);

const rootAdminpath = (() => {
  if (isSetup || __IS_MONOREPO__) {
    return __IS_ADMIN__
      ? path.resolve(appPath, 'strapi-admin')
      : path.resolve(appPath, 'packages', 'strapi-admin');
  }
  return path.resolve(appPath, 'admin');
})();

// Resolve path from app directory to relative path.
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

// const resolveOwn = relativePath => path.resolve(__dirname, '..', relativePath);

module.exports = {
  admin: path.resolve(appPath, 'admin'),
  appIndexJs: resolveApp('src/index.js'),
  appPath: appPath,
  //adminSrc: path.resolve(adminPath, 'admin', 'src'),
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
  strapiAdmin : path.resolve(appPath, 'strapi-admin')
};
