const path = require('path');
const webpack = require('webpack');

// Webpack plugins
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const DuplicatePckgChecker = require('duplicate-package-checker-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackBar = require('webpackbar');
const isWsl = require('is-wsl');
const alias = require('./webpack.alias.js');

// TODO: parametrize
const URLs = {
  mode: 'host',
};

module.exports = ({
  entry,
  dest,
  env,
  options = {
    backend: 'http://localhost:1337',
    publicPath: '/admin/',
  },
}) => {
  const isProduction = env === 'production';

  const webpackPlugins = isProduction
    ? [
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        }),
        new MiniCssExtractPlugin({
          filename: '[name].[chunkhash].css',
          chunkFilename: '[name].[chunkhash].chunkhash.css',
        }),
      ]
    : [
        new DuplicatePckgChecker({
          verbose: true,
        }),
        new FriendlyErrorsWebpackPlugin(),
      ];

  const scssLoader = isProduction
    ? [
        {
          loader: MiniCssExtractPlugin.loader,
          options: {
            fallback: require.resolve('style-loader'),
            publicPath: options.publicPath,
          },
        },
      ]
    : [{ loader: 'style-loader', options: {} }];

  return {
    mode: isProduction ? 'production' : 'development',
    bail: isProduction ? true : false,
    devtool: isProduction ? false : 'cheap-module-source-map',
    entry,
    output: {
      path: dest,
      publicPath: options.publicPath,
      // Utilize long-term caching by adding content hashes (not compilation hashes)
      // to compiled assets for production
      filename: isProduction ? '[name].[contenthash:8].js' : 'bundle.js',
      chunkFilename: isProduction
        ? '[name].[contenthash:8].chunk.js'
        : '[name].chunk.js',
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        // Copied from react-scripts
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
          parallel: !isWsl,
          // Enable file caching
          cache: true,
          sourceMap: false,
        }),
      ],
      // splitChunks: {
      //   chunks: 'all',
      //   name: false,
      // },
      runtimeChunk: true,
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              cacheDirectory: true,
              cacheCompression: isProduction,
              compact: isProduction,
              presets: [
                require.resolve('@babel/preset-env'),
                require.resolve('@babel/preset-react'),
              ],
              plugins: [
                require.resolve('@babel/plugin-proposal-class-properties'),
                require.resolve('@babel/plugin-syntax-dynamic-import'),
                require.resolve(
                  '@babel/plugin-proposal-async-generator-functions'
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
      mainFields: ['browser', 'jsnext:main', 'main'],
    },
    plugins: [
      new WebpackBar(),
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(__dirname, 'index.html'),
        favicon: path.resolve(__dirname, 'admin/src/favicon.ico'),
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(
          isProduction ? 'production' : 'development'
        ),
        NODE_ENV: JSON.stringify(isProduction ? 'production' : 'development'),
        REMOTE_URL: JSON.stringify(options.publicPath),
        BACKEND_URL: JSON.stringify(options.backend),
        MODE: JSON.stringify(URLs.mode), // Allow us to define the public path for the plugins assets.
        PUBLIC_PATH: JSON.stringify(options.publicPath),
      }),

      ...webpackPlugins,
    ],
  };
};
