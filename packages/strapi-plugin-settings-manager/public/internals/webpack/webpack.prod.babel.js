// Important modules this config uses
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const OfflinePlugin = require('offline-plugin');
const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-/i, '');

// PostCSS plugins
const cssnext = require('postcss-cssnext');
const postcssFocus = require('postcss-focus');
const postcssReporter = require('postcss-reporter');

module.exports = require('./webpack.base.babel')({
  // In production, we skip all hot-reloading stuff
  entry: [
    path.join(process.cwd(), 'app/app.js'),
  ],

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: {
    filename: '[name].js',
    chunkFilename: '[name].[chunkhash].chunk.js',
    // publicPath: 'http://localhost:1337/settings-manager/',
    publicPath: '/settings-manager/',
  },

  // We use ExtractTextPlugin so we get a seperate SCSS file instead
  // of the CSS being in the JS and injected as a style tag
  cssLoaders: `style-loader!css-loader?localIdentName=${pluginId}[local]__[path][name]__[hash:base64:5]&modules&importLoaders=1&sourceMap!postcss-loader!sass-loader`,

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
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      children: true,
      minChunks: 2,
      async: true,
    }),

    // Merge all duplicate modules
    new webpack.optimize.DedupePlugin(),


    // Minify and optimize the JavaScript
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false, // ...but do not show warnings in the console (there is a lot of them)
      },
    }),


    // Minify and optimize the index.html
    new HtmlWebpackPlugin({
      template: 'app/index.html',
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
    }),

    // Put it in the end to capture all the HtmlWebpackPlugin's
    // assets manipulations and do leak its manipulations to HtmlWebpackPlugin
    // new OfflinePlugin({
    //   relativePaths: false,
    //   publicPath: '/',
    //
    //   // No need to cache .htaccess. See http://mxs.is/googmp,
    //   // this is applied before any match in `caches` section
    //   excludes: ['.htaccess'],
    //
    //   caches: {
    //     main: [':rest:'],
    //
    //     // All chunks marked as `additional`, loaded after main section
    //     // and do not prevent SW to install. Change to `optional` if
    //     // do not want them to be preloaded at all (cached only when first loaded)
    //     additional: ['*.chunk.js'],
    //   },
    //
    //   // Removes warning for about `additional` section usage
    //   safeToUseOptionalCaches: true,
    //
    //   AppCache: false,
    // }),
  ],
});
