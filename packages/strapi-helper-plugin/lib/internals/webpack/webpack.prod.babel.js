// Important modules this config uses
const path = require('path');
const _ = require('lodash');

const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


const { __IS_ADMIN__, __IS_MONOREPO__, __PWD__ } = require('./configs/globals');
const paths = require('./configs/paths');
const postcssPlugins = require('./configs/postcssOptions');
const URLs = require('./configs/server');

const base = require('./webpack.base.babel');

const plugins = [
  new webpack.DllReferencePlugin({
    manifest: require(paths.manifestJson),
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
  // new BundleAnalyzerPlugin(),
];

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
      filepath: paths.filepath,
    }),
  );
  plugins.push(
    new CopyWebpackPlugin([
      {
        from: 'config/plugins.json',
        context: path.resolve(paths.adminPath, 'admin', 'src'),
        to: 'config/plugins.json',
      },
    ]),
  );
}

const main = (() => {

  if (__IS_ADMIN__ && __IS_MONOREPO__) {
    return path.join(process.cwd(), 'admin', 'src', 'app.js');
  } else if (__IS_ADMIN__) {
    return path.join(paths.appPath, 'admin', 'admin', 'src', 'app.js');
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
      publicPath: URLs.host,
    },
    _.isUndefined,
  ),

  // In production, we minify our CSS with cssnano
  postcssPlugins,

  // Plugins
  plugins,
  babelPresets: [],
  disableExtractTextPlugin: false,
  externals: {},
});
