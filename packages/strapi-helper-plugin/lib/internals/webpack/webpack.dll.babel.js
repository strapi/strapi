/**
 * WEBPACK DLL GENERATOR
 *
 * This profile is used to cache webpack's module
 * contexts for external library and framework type
 * dependencies which will usually not change often enough
 * to warrant building them from scratch every time we use
 * the webpack process.
 */

const { join } = require('path');

const defaults = require('lodash/defaultsDeep');
const webpack = require('webpack');

const dllPlugin = require('../config').dllPlugin;
const helperPkg = require(join(__dirname, '..', '..', '..', 'package.json'));

const pluginPkg = require(join(process.cwd(), 'package.json'));
if (!pluginPkg.dllPlugin) { pluginPkg.dllPlugin = {}; }
const dllConfig = defaults(pluginPkg.dllPlugin, dllPlugin.defaults);
const outputPath = dllConfig.path;

module.exports = {
  context: process.cwd(),
  entry: dllPlugin.entry(helperPkg, pluginPkg),
  devtool: 'eval',
  output: {
    filename: '[name].dll.js',
    path: outputPath,
    library: '[name]',
  },
  plugins: [
    new webpack.DllPlugin({ name: '[name]', path: join(outputPath, '[name].json') }), // eslint-disable-line no-new
  ],
  resolve: {
    modules: [
      'node_modules',
      'node_modules/strapi-helper-plugin/node_modules',
    ],
  },
};
