'use strict';

const path = require('path');
const fse = require('fs-extra');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const WebpackBar = require('webpackbar');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const alias = require('./webpack.alias');
const getClientEnvironment = require('./env');

const EE_REGEX = /from.* ['"]ee_else_ce\//;

module.exports = ({
  cacheDir,
  dest,
  entry,
  env,
  optimize,
  pluginsPath,
  options = {
    backend: 'http://localhost:1337',
    adminPath: '/admin/',
    features: [],
  },
  roots = {
    eeRoot: './ee/admin',
    ceRoot: './admin/src',
  },
  tsConfigFilePath,
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

  // Directly inject a polyfill in the webpack entry point before the entry point
  // FIXME: I have noticed a bug regarding the helper-plugin and esbuild-loader
  // The only I could fix it was to inject the babel polyfill
  const babelPolyfill = '@babel/polyfill/dist/polyfill.min.js';

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
          test: /\.tsx?$/,
          loader: require.resolve('esbuild-loader'),
          include: [cacheDir, ...pluginsPath],
          exclude: /node_modules/,
          options: {
            loader: 'tsx',
            target: 'es2015',
          },
        },
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

                  if (fileContent.match(/from.* ['"]ee_else_ce\//)) {
                    return true;
                  }

                  return EE_REGEX.test(fileContent);
                } catch (e) {
                  return false;
                }
              },
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
                    [
                      require.resolve('@strapi/babel-plugin-switch-ee-ce'),
                      {
                        // Imported this tells the custom plugin where to look for the ee folder
                        roots,
                      },
                    ],

                    [
                      require.resolve('@babel/plugin-transform-runtime'),
                      {
                        helpers: true,
                        regenerator: true,
                      },
                    ],
                    [require.resolve('babel-plugin-styled-components'), { pure: true }],
                  ],
                },
              },
            },
            // Use esbuild-loader for the other files
            {
              use: {
                loader: require.resolve('esbuild-loader'),
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
            loader: require.resolve('esbuild-loader'),
            options: {
              loader: 'jsx',
              target: 'es2015',
            },
          },
        },

        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
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
          use: require.resolve('html-loader'),
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
      extensions: ['.js', '.jsx', '.react.js', '.ts', '.tsx'],
      mainFields: ['browser', 'jsnext:main', 'main'],
      modules: ['node_modules', path.resolve(__dirname, 'node_modules')],
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(__dirname, 'index.html'),
      }),
      new webpack.DefinePlugin(envVariables),

      new NodePolyfillPlugin(),

      new ForkTsCheckerPlugin({
        typescript: {
          configFile: tsConfigFilePath,
        },
      }),

      !isProduction && process.env.REACT_REFRESH !== 'false' && new ReactRefreshWebpackPlugin(),

      ...webpackPlugins,
    ].filter(Boolean),
  };
};
