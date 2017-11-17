/**
 * WEBPACK DLL GENERATOR
 *
 * This profile is used to cache webpack's module
 * contexts for external library and framework type
 * dependencies which will usually not change often enough
 * to warrant building them from scratch every time we use
 * the webpack process.
 */

const path = require('path');
const webpack = require('webpack');
const isAdmin = process.env.IS_ADMIN === 'true';

const appPath = isAdmin ? path.resolve(process.env.PWD, '..') : path.resolve(process.env.PWD, '..', '..');

module.exports = {
  context: appPath,
  entry: {
    vendor: ['react', 'react-dom', 'react-intl', 'reactstrap', 'react-transition-group', 'immutable', 'lodash'] // Shared dependencies accross the admin and plugins.
  },
  devtool: 'cheap-module-source-map',
  output: {
    filename: '[name].dll.js',
    path: path.join(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'lib', 'internals', 'webpack', 'dist'),

    // The name of the global variable which the library's
    // require() function will be assigned to
    library: '[name]_lib',
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_lib',
      path: path.join(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'lib', 'internals', 'webpack', 'manifest.json'),
    })
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
      'lodash': path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'lodash'),
      'immutable': path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'immutable'),
      'react-intl': path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react-intl'),
      'react': path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react'),
      'react-dom': path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react-dom'),
      'react-transition-group': path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react-transition-group'),
      'reactstrap': path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'reactstrap')
    },
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
