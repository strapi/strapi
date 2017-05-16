// Important modules this config uses
const path = require('path');

const cssnext = require('postcss-cssnext');
const postcssFocus = require('postcss-focus');
const postcssReporter = require('postcss-reporter');
const webpack = require('webpack');

const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-/i, '');

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
    publicPath: '/content-manager/',
  },

  // We use ExtractTextPlugin so we get a seperate SCSS file instead
  // of the CSS being in the JS and injected as a style tag
  cssLoaders: `style-loader!css-loader?localIdentName=${pluginId}[local]__[path][name]__[hash:base64:5]&modules&importLoaders=1&sourceMap!postcss-loader?config=${path.resolve(__dirname, '..', 'postcss', 'postcss.config.js')}!sass-loader`,

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
  ],
});
