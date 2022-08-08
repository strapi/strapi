'use strict';

const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { DuplicateReporterPlugin } = require('duplicate-dependencies-webpack-plugin');
const getPluginsPath = require('./utils/get-plugins-path');
const webpackConfig = require('./webpack.config');

module.exports = () => {
  const analyzeBundle = process.env.ANALYZE_BUNDLE;
  const analyzeDuplicateDependencies = process.env.ANALYZE_DEPS;
  const entry = path.join(__dirname, 'admin', 'src');
  const dest = path.join(__dirname, 'build');

  // When running the analyze:bundle command, it needs a production build
  // to display the tree map of modules
  const env = analyzeBundle ? 'production' : 'development';
  const options = {
    backend: 'http://localhost:1337',
    adminPath: '/admin/',
  };
  const pluginsPath = getPluginsPath();

  const args = {
    entry,
    cacheDir: __dirname,
    pluginsPath,
    dest,
    env,
    options,
    tsConfigFilePath: path.resolve(__dirname, 'admin', 'src', 'tsconfig.json'),
  };

  const config = webpackConfig(args);

  if (analyzeBundle) {
    config.plugins.push(new BundleAnalyzerPlugin());
  }

  if (analyzeDuplicateDependencies === 'true') {
    config.plugins.push(new DuplicateReporterPlugin());
  }

  return {
    ...config,

    devServer: {
      port: 4000,
      client: {
        logging: 'none',
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      historyApiFallback: {
        index: '/admin/',
        disableDotRule: true,
      },
    },
  };
};
