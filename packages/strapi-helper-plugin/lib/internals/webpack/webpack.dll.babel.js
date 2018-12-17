/**
 * WEBPACK DLL GENERATOR
 *
 * This profile is used to cache webpack's module contexts for external library and framework type dependencies which
 * will usually not change often enough to warrant building them from scratch every time we use the webpack process.
 */

const path = require('path');
const webpack = require('webpack');
const isAdmin = process.env.IS_ADMIN === 'true';

const isSetup = process.env.IS_MONOREPO || false;
const appPath = process.env.APP_PATH || path.resolve(process.env.PWD, '..', isAdmin ? '' : '..');

const rootAdminpath = (() => {
  if (isSetup) {
    return isAdmin
      ? path.resolve(appPath, 'strapi-admin')
      : path.resolve(appPath, 'packages', 'strapi-admin');
  }

  return path.resolve(appPath, 'admin');
})();

module.exports = {
  context: appPath,
  entry: {
    vendor: [
      'react',
      'react-dom',
      'react-intl',
      'reactstrap',
      'react-transition-group',
      'immutable',
      'lodash',
      'babel-polyfill',
    ], // Shared dependencies accross the admin and plugins.
  },
  devtool: 'cheap-module-source-map',
  output: {
    filename: '[name].dll.js',
    path: path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'lib',
      'internals',
      'webpack',
      'dist',
    ),

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
    alias: {
      moment: 'moment/moment.js',
      'babel-polyfill': path.resolve(
        rootAdminpath,
        'node_modules',
        'strapi-helper-plugin',
        'node_modules',
        'babel-polyfill',
      ),
      lodash: path.resolve(
        rootAdminpath,
        'node_modules',
        'strapi-helper-plugin',
        'node_modules',
        'lodash',
      ),
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
      react: path.resolve(
        rootAdminpath,
        'node_modules',
        'strapi-helper-plugin',
        'node_modules',
        'react',
      ),
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
      'react-dnd': path.resolve(
        rootAdminpath,
        'node_modules',
        'strapi-helper-plugin',
        'node_modules',
        'react-dnd',
      ),
      'react-dnd-hmtl5-backend': path.resolve(
        rootAdminpath,
        'node_modules',
        'strapi-helper-plugin',
        'node_modules',
        'react-dnd-html5-backend',
      ),
      'styled-components': path.resolve(
        rootAdminpath,
        'node_modules',
        'strapi-helper-plugin',
        'node_modules',
        'styled-components',
      ),
      'react-copy-to-clipboard': path.resolve(
        rootAdminpath,
        'node_modules',
        'strapi-helper-plugin',
        'node_modules',
        'react-copy-to-clipboard',
      ),
    },
    symlinks: false,
    extensions: ['.js', '.jsx', '.react.js'],
    mainFields: ['browser', 'jsnext:main', 'main'],
  },
};
