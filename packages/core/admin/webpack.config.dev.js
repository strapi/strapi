'use strict';

/* eslint-disable import/no-extraneous-dependencies */

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
    backend: '/',
    adminPath: '/admin/',

    /**
     * Ideally this would take more scenarios into account, such
     * as the `telemetryDisabled` property in the package.json
     * of the users project. For builds based on an app we are
     * passing this information throgh, but here we do not have access
     * to the app's package.json. By using at least an environment variable
     * we can make sure developers can actually test this functionality in
     * dev-mode.
     */

    telemetryDisabled: process.env.STRAPI_TELEMETRY_DISABLED === 'true',
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
