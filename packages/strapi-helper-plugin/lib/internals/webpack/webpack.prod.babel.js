// Important modules this config uses
const _ = require('lodash');
const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const cssnext = require('postcss-cssnext');
const postcssFocus = require('postcss-focus');
const postcssReporter = require('postcss-reporter');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const WriteJsonPlugin = require('write-json-webpack-plugin');

const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-plugin-/i, '');
const dllPlugin = pkg.dllPlugin;

const isAdmin = process.env.IS_ADMIN === 'true';
const isSetup = path.resolve(process.env.PWD, '..', '..') === path.resolve(process.env.INIT_CWD);
const appPath = (() => {
  if (process.env.APP_PATH) {
    return process.env.APP_PATH;
  }

  return isAdmin ? path.resolve(process.env.PWD, '..') : path.resolve(process.env.PWD, '..', '..');
})();
const adminPath = (() => {
  if (isSetup) {
    return isAdmin ? path.resolve(appPath, 'strapi-admin') : path.resolve(process.env.PWD, '..');
  }

  return path.resolve(appPath, 'admin');
})();

// Necessary configuration file to ensure that plugins will be loaded.
const pluginsToInitialize = (() => {
  try {
    return require(path.resolve(adminPath, 'admin', 'src', 'config', 'plugins.json'));
  } catch (e) {
    return [];
  }
})();

const plugins = [
  new webpack.DllReferencePlugin({
    manifest: require(isSetup ?
      path.join(__dirname, 'manifest.json'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'lib', 'internals', 'webpack', 'manifest.json')
    ),
  }),
  // Minify and optimize the JavaScript
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    parallel: true,
    compress: {
      warnings: false
    },
    uglifyOptions: {
      ecma: 8,
    },
  }),
  new webpack.LoaderOptionsPlugin({
    minimize: true
  }),
  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  // new BundleAnalyzerPlugin(),
];

// Build the `index.html file`
if (isAdmin) {
  plugins.push(new HtmlWebpackPlugin({
    template: 'admin/src/index.html',
    minify: {
      removeComments: true,
      collapseWhitespace: true,
      removeRedundantAttributes: true,
      useShortDoctype: true,
      removeEmptyAttributes: true,
      removeStyleLinkTypeAttributes: true,
      keepClosingSlash: true,
      minifyJS: true,
      minifyCSS: true,
      minifyURLs: true,
    },
    chunksSortMode: 'manual',
    chunks: ['main'],
    inject: true,
  }));
  plugins.push(new ExtractTextPlugin('[name].[contenthash].css'));
  plugins.push(new AddAssetHtmlPlugin({
    filepath: path.resolve(__dirname, 'dist/*.dll.js')
  }));
  plugins.push(new WriteJsonPlugin({
      object: pluginsToInitialize,
      path: 'config',
      // default output is timestamp.json
      filename: 'plugins.json',
  }));
}

const main = (() => {
  if (isAdmin && isSetup) {
    return path.join(process.cwd(), 'admin', 'src', 'app.js');
  } else if (isAdmin) {
    return path.join(appPath, 'admin', 'admin', 'src', 'app.js');
  }

  return path.join(process.env.PWD, 'node_modules', 'strapi-helper-plugin', 'lib', 'src', 'app.js');
})();

module.exports = require('./webpack.base.babel')({
  // In production, we skip all hot-reloading stuff
  entry: {
    main
  },

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: {
    filename: '[name].js',
    chunkFilename: '[name].[chunkhash].chunk.js'
  },

  // In production, we minify our CSS with cssnano
  postcssPlugins: [
    postcssFocus(),
    cssnext({
      browsers: ['last 2 versions', 'IE > 10'],
    }),
    postcssReporter({
      clearMessages: true,
    }),
  ],

  // Plugins
  plugins,

  // Babel presets configuration
  babelPresets: [
    [
      require.resolve('babel-preset-env'),
      {
        es2015: {
          modules: false,
        },
      },
    ],
    require.resolve('babel-preset-react'),
    require.resolve('babel-preset-stage-0'),
  ],

  alias: {
    moment: 'moment/moment.js',
    'babel-polyfill': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'babel-polyfill'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'babel-polyfill'),
    'lodash': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'lodash'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'lodash'),
    'immutable': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'immutable'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'immutable'),
    'react-intl': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-intl'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react-intl'),
    'react': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react'),
    'react-dom': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-dom'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react-dom'),
    'react-transition-group': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-transition-group'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'react-transition-group'),
    'reactstrap': isSetup ?
      path.resolve(__dirname, '..', '..', '..', 'node_modules', 'reactstrap'):
      path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin', 'node_modules', 'reactstrap')
  },

  devtool: 'cheap-module-source-map',
});
