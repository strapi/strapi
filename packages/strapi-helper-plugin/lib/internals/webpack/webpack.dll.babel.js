/**
 * WEBPACK DLL GENERATOR
 *
 * This profile is used to cache webpack's module contexts for external library and framework type dependencies which
 * will usually not change often enough to warrant building them from scratch every time we use the webpack process.
 */

const path = require('path');
const webpack = require('webpack');
const { __APP_PATH__, __IS_ADMIN__, __IS_MONOREPO__, __PWD__} = require('./configs/global')
const { DEV_ALIAS } = require('./configs/alias')
const appPath = __APP_PATH__ || path.resolve(__PWD__, '..', ( __IS_ADMIN__ ? '' : '..' ));

const rootAdminpath = (() => {
  if (__IS_MONOREPO__) {
    return __IS_ADMIN__ ? path.resolve(appPath, 'strapi-admin') : path.resolve(appPath, 'packages', 'strapi-admin');
  }

  return path.resolve(appPath, 'admin');
})();



module.exports = {
  context: appPath,
  entry: {
    vendor: ['react', 'react-dom', 'react-intl', 'reactstrap', 'react-transition-group', 'immutable', 'lodash', 'babel-polyfill'], // Shared dependencies accross the admin and plugins.
  },
  devtool: 'cheap-module-source-map',
  output: {
    filename: '[name].dll.js',
    path: path.resolve(rootAdminpath, 'node_modules', 'strapi-helper-plugin', 'lib', 'internals', 'webpack', 'dist'),

    // The name of the global variable which the library's
    // require() function will be assigned to
    library: '[name]_lib',
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_lib',
      path: path.resolve(rootAdminpath, 'admin', 'src', 'config', 'manifest.json'),
    }),
  ],
  resolve: {
    modules: [
      'admin/src',
      'node_modules/strapi-helper-plugin/lib/src',
      'node_modules/strapi-helper-plugin/node_modules',
      'node_modules',
    ],
    alias: DEV_ALIAS,
    symlinks: false,
    extensions: [
      '.js',
      '.jsx',
      '.react.js',
    ],
    mainFields: [
      'browser',
      'jsnext:main',
      'main',
    ],
  },
};
