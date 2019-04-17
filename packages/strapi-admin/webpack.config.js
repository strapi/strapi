const path = require('path');
const webpack = require('webpack');
// const fs = require('fs-extra');

// Webpack plugins
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackDashboard = require('webpack-dashboard/plugin');
const OpenBrowserWebpackPlugin = require('open-browser-webpack-plugin');
const DuplicatePckgChecker = require('duplicate-package-checker-webpack-plugin');
const alias = require('./webpack.alias.js');

const devMode = process.env.NODE_ENV !== 'production';
const prodMode = process.env.NODE_ENV === 'production';
const startDate = Date.now();

const URLs = {
  host: '/',
  backend: 'http://localhost:1337',
  publicPath: '/admin',
  mode: 'host',
};
const appDir = path.resolve(process.cwd(), '..');
const PORT = 4000;

const webpackPlugins = devMode
  ? [
    new WebpackDashboard(),
    new DuplicatePckgChecker({
      verbose: true,
    }),
    new OpenBrowserWebpackPlugin({
      url: `http://localhost:${PORT}/${URLs.publicPath}`,
    }),
  ]
  : [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: devMode ? '[name].css' : '[name].[chunkhash].js',
      chunkFilename: devMode
        ? '[name].chunk.css'
        : '[name].[chunkhash].chunkhash.css',
    }),
  ];

// Use style loader in dev mode to optimize compilation
const scssLoader = devMode
  ? [{ loader: 'style-loader', options: {} }]
  : [
    {
      loader: MiniCssExtractPlugin.loader,
      options: {
        fallback: require.resolve('style-loader'),
        publicPath: URLs.publicPath,
      },
    },
  ];

module.exports = {
  mode: 'development',
  devServer: {
    historyApiFallback: {
      index: URLs.publicPath,
    },
    port: 4000,
    // hot: true,
  },
  stats: devMode ? 'minimal' : 'errors-only',
  devtool: 'cheap-module-source-map',
  context: path.resolve(__dirname),
  // TODO: change this with the correct path
  // It only work with the monorepo setup
  entry: path.resolve(appDir, 'strapi-admin', 'admin', 'src', 'app.js'),
  output: {
    path: path.resolve(process.cwd(), 'build'),
    publicPath: URLs.publicPath,
    // Utilize long-term caching by adding content hashes (not compilation hashes)
    // to compiled assets for production
    filename: devMode ? '[name].js' : '[name].[chunkhash].js',
    chunkFilename: devMode ? '[name].chunk.js' : '[name].[chunkhash].chunk.js',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        // exclude: /node_modules\/(?!strapi-helper-plugin\/).*/,
        exclude: /node_modules/,
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            cacheDirectory: true,
            cacheCompression: prodMode,
            compact: prodMode,
            presets: [
              require.resolve('@babel/preset-env'),
              require.resolve('@babel/preset-react'),
            ],
            plugins: [
              require.resolve('@babel/plugin-proposal-class-properties'),
              require.resolve('@babel/plugin-syntax-dynamic-import'),
              require.resolve(
                '@babel/plugin-proposal-async-generator-functions',
              ),
              [
                require.resolve('@babel/plugin-transform-runtime'),
                {
                  helpers: true,
                  regenerator: true,
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        include: /node_modules/,
        use: [
          {
            loader: require.resolve('style-loader'),
          },
          {
            loader: require.resolve('css-loader'),
            options: {
              sourceMap: false,
            },
          },
          {
            loader: require.resolve('postcss-loader'),
            options: {
              config: {
                path: path.resolve(__dirname, 'postcss.config.js'),
              },
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        use: scssLoader.concat([
          {
            loader: require.resolve('css-loader'),
            options: {
              localIdentName: '[local]__[path][name]__[hash:base64:5]',
              modules: true,
              importLoaders: 1,
              sourceMap: false,
            },
          },
          {
            loader: require.resolve('postcss-loader'),
            options: {
              config: {
                path: path.resolve(__dirname, 'postcss.config.js'),
              },
            },
          },
          {
            loader: 'sass-loader',
          },
        ]),
      },
      {
        test: /\.(svg|eot|otf|ttf|woff|woff2)$/,
        use: 'file-loader',
      },
      {
        test: /\.(jpg|png|gif)$/,
        loaders: [
          require.resolve('file-loader'),
          {
            loader: require.resolve('image-webpack-loader'),
            query: {
              mozjpeg: {
                progressive: true,
              },
              gifsicle: {
                interlaced: false,
              },
              optipng: {
                optimizationLevel: 4,
              },
              pngquant: {
                quality: '65-90',
                speed: 4,
              },
            },
          },
        ],
      },
      {
        test: /\.html$/,
        include: [path.join(__dirname, 'src')],
        use: require.resolve('html-loader'),
      },
      {
        test: /\.(mp4|webm)$/,
        loader: require.resolve('url-loader'),
        options: {
          limit: 10000,
        },
      },
    ],
  },
  resolve: {
    alias,
    symlinks: false,
    extensions: ['.js', '.jsx', '.react.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: path.resolve(__dirname, 'index.html'),
      favicon: path.resolve(__dirname, 'admin/src/favicon.ico'),
    }),
    new SimpleProgressWebpackPlugin(),
    new FriendlyErrorsWebpackPlugin({
      compilationSuccessInfo: {
        messages: [
          'Your application is running here http://localhost:4000',
          `Compiled in ${Date.now() - startDate} seconds`,
        ],
      },
    }),

    new webpack.DefinePlugin({
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      REMOTE_URL: JSON.stringify(URLs.host),
      BACKEND_URL: JSON.stringify(URLs.backend),
      MODE: JSON.stringify(URLs.mode), // Allow us to define the public path for the plugins assets.
      PUBLIC_PATH: JSON.stringify(URLs.publicPath),
    }),
  ].concat(webpackPlugins),
};
