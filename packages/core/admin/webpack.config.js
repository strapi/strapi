'use strict';

const path = require('path');
const fse = require('fs-extra');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const WebpackBar = require('webpackbar');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const alias = require('./webpack.alias');
const getClientEnvironment = require('./env');
const { requirePackage } = require('./pnp');

const EE_REGEX = /from.* ['"]ee_else_ce\//;

module.exports = ({
  entry,
  cacheDir,
  pluginsPath,
  dest,
  env,
  optimize,
  options = {
    backend: 'http://localhost:1337',
    adminPath: '/admin/',
    features: [],
  },
  roots = {
    eeRoot: './ee/admin',
    ceRoot: './admin/src',
  },
}) => {
  const isProduction = env === 'production';
  const envVariables = getClientEnvironment({ ...options, env });
  const webpackPlugins = isProduction
    ? [
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        }),
        new MiniCssExtractPlugin({
          filename: '[name].[chunkhash].css',
          chunkFilename: '[name].[chunkhash].chunkhash.css',
          ignoreOrder: true,
        }),
        new WebpackBar(),
      ]
    : [];

  const babelPolyfill = '@babel/polyfill/dist/polyfill.min.js'; //requirePackage.resolveRequest('@babel/polyfill/dist/polyfill.min.js');

  return {
    mode: isProduction ? 'production' : 'development',
    bail: isProduction ? true : false,
    devtool: false,
    experiments: {
      topLevelAwait: true,
    },
    entry: [babelPolyfill, entry],
    output: {
      path: dest,
      publicPath: options.adminPath,
      // Utilize long-term caching by adding content hashes (not compilation hashes)
      // to compiled assets for production
      filename: isProduction ? '[name].[contenthash:8].js' : '[name].bundle.js',
      chunkFilename: isProduction ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
    },
    optimization: {
      minimize: optimize,
      minimizer: [
        new ESBuildMinifyPlugin({
          target: 'es2015',
          css: true, // Apply minification to CSS assets
        }),
      ],
      runtimeChunk: true,
    },
    module: {
      rules: [
        {
          test: /\.m?jsx?$/,
          include: cacheDir,
          oneOf: [
            // Use babel-loader for files that distinct the ee and ce code
            // These files have an import Something from 'ee_else_ce/
            {
              test(filePath) {
                if (!filePath) {
                  return false;
                }

                try {
                  const fileContent = fse.readFileSync(filePath).toString();

                  return EE_REGEX.test(fileContent);
                } catch (e) {
                  return false;
                }
              },
              use: {
                loader: requirePackage.resolve('babel-loader'),
                options: {
                  cacheDirectory: true,
                  cacheCompression: isProduction,
                  compact: isProduction,
                  presets: [
                    requirePackage.resolve('@babel/preset-env'),
                    requirePackage.resolve('@babel/preset-react'),
                  ],
                  plugins: [
                    [
                      requirePackage.resolve('@strapi/babel-plugin-switch-ee-ce'),
                      {
                        // Imported this tells the custom plugin where to look for the ee folder
                        roots,
                      },
                    ],

                    [
                      requirePackage.resolve('@babel/plugin-transform-runtime'),
                      {
                        helpers: true,
                        regenerator: true,
                      },
                    ],
                    [requirePackage.resolve('babel-plugin-styled-components'), { pure: true }],
                  ],
                },
              },
            },
            // Use esbuild-loader for the other files
            {
              use: {
                loader: requirePackage.resolve('esbuild-loader'),
                options: {
                  loader: 'jsx',
                  target: 'es2015',
                },
              },
            },
          ],
        },
        {
          test: /\.m?jsx?$/,
          include: pluginsPath,
          use: {
            loader: requirePackage.resolve('esbuild-loader'),
            options: {
              loader: 'jsx',
              target: 'es2015',
            },
          },
        },

        {
          test: /\.css$/i,
          use: [requirePackage.resolve('style-loader'), requirePackage.resolve('css-loader')],
        },
        {
          test: /\.(svg|eot|otf|ttf|woff|woff2)$/,
          type: 'asset/resource',
        },
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.ico$/],
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 1000,
            },
          },
        },
        {
          test: /\.html$/,
          include: [path.join(__dirname, 'src')],
          use: requirePackage.resolve('html-loader'),
        },
        {
          test: /\.(mp4|webm)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 10000,
            },
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
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(__dirname, 'index.html'),
        // FIXME
        // favicon: path.resolve(__dirname, 'admin/src/favicon.ico'),
      }),
      new webpack.DefinePlugin(envVariables),

      new NodePolyfillPlugin(),
      !isProduction && process.env.REACT_REFRESH !== 'false' && new ReactRefreshWebpackPlugin(),
      ...webpackPlugins,
    ].filter(Boolean),
  };
};
