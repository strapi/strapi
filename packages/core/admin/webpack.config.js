'use strict';

const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const WebpackBar = require('webpackbar');
const browserslist = require('browserslist');
const browserslistToEsbuild = require('browserslist-to-esbuild');

const alias = require('./webpack.alias');
const getClientEnvironment = require('./env');
const { createPluginsExcludePath } = require('./utils/plugins');

module.exports = ({
  dest,
  entry,
  env,
  optimize,
  plugins,
  options = {
    backend: 'http://localhost:1337',
    adminPath: '/admin/',
    features: [],
  },
  tsConfigFilePath,
  enforceSourceMaps,
}) => {
  const isProduction = env === 'production';

  const envVariables = getClientEnvironment({ ...options, env });

  const webpackPlugins = isProduction
    ? [
        new MiniCssExtractPlugin({
          filename: '[name].[chunkhash].css',
          chunkFilename: '[name].[chunkhash].chunkhash.css',
          ignoreOrder: true,
        }),
        new WebpackBar(),
      ]
    : [];

  const nodeModulePluginPaths = Object.values(plugins)
    .filter((plugin) => plugin.info?.packageName || plugin.info?.required)
    .map((plugin) => plugin.pathToPlugin);

  const excludeRegex = createPluginsExcludePath(nodeModulePluginPaths);

  // Ensure we use the config in this directory, even if run with a different
  // working directory
  const browserslistConfig = browserslist.loadConfig({ path: __dirname });
  const buildTarget = browserslistToEsbuild(browserslistConfig);

  return {
    mode: isProduction ? 'production' : 'development',
    bail: !!isProduction,
    devtool: isProduction && !enforceSourceMaps ? false : 'source-map',
    experiments: {
      topLevelAwait: true,
    },
    entry: [entry],
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
          target: buildTarget,
          css: true, // Apply minification to CSS assets
        }),
      ],
      moduleIds: 'deterministic',
      runtimeChunk: true,
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          loader: require.resolve('esbuild-loader'),
          exclude: excludeRegex,
          options: {
            loader: 'tsx',
            target: buildTarget,
            jsx: 'automatic',
          },
        },
        {
          test: /\.(js|jsx|mjs)$/,
          exclude: excludeRegex,
          use: {
            loader: require.resolve('esbuild-loader'),
            options: {
              loader: 'jsx',
              target: buildTarget,
            },
          },
        },
        /**
         * This is used to avoid webpack import errors where
         * the origin is strict EcmaScript Module.
         *
         * e. g. a module with javascript mimetype, a '.mjs' file,
         * or a '.js' file where the package.json contains '"type": "module"'
         */
        {
          test: /\.m?jsx?$/,
          resolve: {
            fullySpecified: false,
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
      extensions: ['.js', '.jsx', '.react.js', '.ts', '.tsx'],
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(__dirname, 'index.html'),
      }),
      new webpack.DefinePlugin(envVariables),

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
