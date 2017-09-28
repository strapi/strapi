// Important modules this config uses
const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const cssnext = require('postcss-cssnext');
const postcssFocus = require('postcss-focus');
const postcssReporter = require('postcss-reporter');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');

const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-plugin-/i, '');
const dllPlugin = pkg.dllPlugin;

const isAdmin = process.env.IS_ADMIN === 'true';

const plugins = [
  new webpack.DllReferencePlugin({
    manifest: require(path.join(__dirname, 'manifest.json')),
  }),
  // Minify and optimize the JavaScript
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    compress: {
      warnings: false
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
}

const appPath = isAdmin
  ? path.join(process.cwd(), 'admin', 'src', 'app.js')
  : path.join(process.cwd(), 'node_modules', 'strapi-helper-plugin', 'lib', 'src', 'app.js');

module.exports = require('./webpack.base.babel')({
  // In production, we skip all hot-reloading stuff
  entry: {
    main: appPath
  },

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: {
    filename: '[name].js',
    chunkFilename: '[name].[chunkhash].chunk.js',
    publicPath: `${isAdmin ? '/admin/' : `/${pluginId}/assets/`}`,
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
      require.resolve('babel-preset-latest'),
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
    'lodash': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'lodash'),
    'immutable': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'immutable'),
    'react-intl': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-intl'),
    'react': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react'),
    'react-dom': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-dom'),
    'react-transition-group': path.resolve(__dirname, '..', '..', '..', 'node_modules', 'react-transition-group')
  },

  devtool: 'cheap-module-source-map',
});
