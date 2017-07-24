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
    path.join(process.cwd(), 'node_modules', 'strapi-helper-plugin', 'lib', 'src', 'app.js'),
  ],

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: {
    filename: '[name].js',
    chunkFilename: '[name].[chunkhash].chunk.js',
    publicPath: `/${pluginId}/`,
  },

  // Transform our own .scss files
  cssLoaders: [{
    loader: 'style-loader',
  }, {
    loader: 'css-loader',
    options: {
      localIdentName: `${pluginId}[local]__[path][name]__[hash:base64:5]`,
      modules: true,
      importLoaders: 1,
      sourceMap: true,
    },
  }, {
    loader: 'postcss-loader',
    options: {
      config: path.resolve(__dirname, '..', 'postcss', 'postcss.config.js'),
    },
  }, {
    loader: 'sass-loader',
  }],

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

    // Minify and optimize the JavaScript
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false, // ...but do not show warnings in the console (there is a lot of them)
      },
    }),
  ],
  // Babel presets configuration
  babelPresets: [
    [
      require.resolve('babel-preset-latest'),
      {
        "es2015": {
          "modules": false,
        },
      },
    ],
    require.resolve('babel-preset-react'),
    require.resolve('babel-preset-stage-0'),
  ],
});
