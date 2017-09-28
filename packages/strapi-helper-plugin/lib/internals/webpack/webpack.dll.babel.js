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

module.exports = {
  context: process.cwd(),
  entry: {
    vendor: ['react', 'react-dom', 'react-intl', 'react-transition-group', 'immutable', 'lodash'] // Shared dependencies accross the admin and plugins.
  },
  devtool: 'cheap-module-source-map',
  output: {
    filename: '[name].dll.js',
    path: path.resolve(__dirname, 'dist/'),

    // The name of the global variable which the library's
    // require() function will be assigned to
    library: '[name]_lib',
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_lib',
      path: path.join(__dirname, 'manifest.json'),
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
      'lodash': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'lodash'),
      'immutable': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'immutable'),
      'react-intl': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-intl'),
      'react': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react'),
      'react-dom': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-dom'),
      'react-transition-group': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-transition-group')
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
