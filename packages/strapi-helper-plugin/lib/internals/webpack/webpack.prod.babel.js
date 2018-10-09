// Important modules this config uses
const path = require('path');
const _ = require('lodash');

const { __IS_ADMIN__, __IS_MONOREPO__, __NODE_ENV__,  __PWD__} = require('./configs/globals');
const appPath = require('./configs/appPath')
const HtmlWebpackPlugin = require('html-webpack-plugin');

const postcssPlugins = require('./configs/postcssOptions');
const { PROD_ALIAS } = require('./configs/alias');
const rootAdminpath = require('./configs/rootAdminpath');
const webpack = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const base = require('./webpack.base.babel');

// const isSetup = path.resolve(process.env.PWD, '..', '..') === path.resolve(process.env.INIT_CWD);
const isSetup = __IS_MONOREPO__;

const adminPath = (() => {
  if (__IS_MONOREPO__) {
    return __IS_ADMIN__ ? path.resolve(appPath, 'strapi-admin') : path.resolve(__PWD__, '..');
  }
  
  return path.resolve(appPath, 'admin');
})();

const plugins = [
  new webpack.DllReferencePlugin({
    manifest: require(path.resolve(rootAdminpath, 'admin', 'src', 'config', 'manifest.json')),
  }),
  // Minify and optimize the JavaScript
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    parallel: true,
    compress: {
      warnings: false,
    },
    uglifyOptions: {
      ecma: 8,
    },
  }),
  new webpack.LoaderOptionsPlugin({
    minimize: true,
  }),
  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  // new BundleAnalyzerPlugin(),
];

let publicPath;

if (__IS_ADMIN__ && !isSetup) {
  // Load server configuration.
  const serverConfig = path.resolve(
    appPath,
    'config',
    'environments',
    _.lowerCase(__NODE_ENV__),
    'server.json',
  );

  try {
    const server = require(serverConfig);

    if (__PWD__.indexOf('/admin') !== -1) {
      if (_.get(server, 'admin.build.host')) {
        publicPath = _.get(server, 'admin.build.host', '/admin').replace(/\/$/, '') || '/';
      } else {
        publicPath = _.get(server, 'admin.path', '/admin');
      }
    }
  } catch (e) {
    throw new Error(`Impossible to access to ${serverConfig}`);
  }
}

// Build the `index.html file`
if (__IS_ADMIN__) {
  plugins.push(
    new HtmlWebpackPlugin({
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
    }),
  );
  plugins.push(
    new AddAssetHtmlPlugin({
      filepath: path.resolve(__dirname, 'dist/*.dll.js'),
    }),
  );
  plugins.push(
    new CopyWebpackPlugin([
      {
        from: 'config/plugins.json',
        context: path.resolve(adminPath, 'admin', 'src'),
        to: 'config/plugins.json',
      },
    ]),
  );
}

const main = (() => {
  if (__IS_ADMIN__ && isSetup) {
    return path.join(process.cwd(), 'admin', 'src', 'app.js');
  } else if (__IS_ADMIN__) {
    return path.join(appPath, 'admin', 'admin', 'src', 'app.js');
  }

  return path.join(__PWD__, 'node_modules', 'strapi-helper-plugin', 'lib', 'src', 'app.js');
})();

module.exports = base({
  // In production, we skip all hot-reloading stuff
  entry: {
    main,
  },

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: _.omitBy(
    {
      filename: '[name].js',
      chunkFilename: '[name].[chunkhash].chunk.js',
      publicPath,
    },
    _.isUndefined,
  ),

  // In production, we minify our CSS with cssnano
  postcssPlugins,

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

  alias: PROD_ALIAS,
  devtool: 'cheap-module-source-map',
  disableExtractTextPlugin: false,
  externals: {},
});
