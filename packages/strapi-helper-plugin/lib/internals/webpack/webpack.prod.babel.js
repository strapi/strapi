// Important modules this config uses
const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const cssnext = require('postcss-cssnext');
const postcssFocus = require('postcss-focus');
const postcssReporter = require('postcss-reporter');
const webpack = require('webpack');

const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-plugin-/i, '');

const isAdmin = process.env.IS_ADMIN === 'true';

const plugins = [
  new webpack.optimize.CommonsChunkPlugin({
    name: 'vendor',
    children: true,
    minChunks: 2,
    async: true,
  }),

  // Minify and optimize the JavaScript
  new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false, // ...but do not show warnings in the console (there is a lot of them)
    },
  }),
];

// Build the `index.htm file`
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
    inject: true,
  }));
  plugins.push(new ExtractTextPlugin('[name].[contenthash].css'));
}

const appPath = isAdmin
  ? path.join(process.cwd(), 'admin', 'src', 'app.js')
  : path.join(process.cwd(), 'node_modules', 'strapi-helper-plugin', 'lib', 'src', 'app.js');

module.exports = require('./webpack.base.babel')({
  // In production, we skip all hot-reloading stuff
  entry: [
    appPath,
  ],

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: {
    filename: '[name].js',
    chunkFilename: '[name].[chunkhash].chunk.js',
    publicPath: `${isAdmin ? 'http://localhost:1337/admin/' : `/${pluginId}/assets/`}`,
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
});
