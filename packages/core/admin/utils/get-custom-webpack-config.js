'use strict';

const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');
const webpack = require('webpack');
const fs = require('fs-extra');
const getWebpackConfig = require('../webpack.config');

const getCustomWebpackConfig = (dir, config) => {
  const adminConfigPathJS = path.join(dir, 'src', 'admin', 'webpack.config.js');
  const adminConfigPathTS = path.join(dir, 'src', 'admin', 'webpack.config.ts');

  let webpackConfig = getWebpackConfig(config);

  if (fs.existsSync(adminConfigPathJS) || fs.existsSync(adminConfigPathTS)) {
    let webpackAdminConfig;
    if (fs.existsSync(adminConfigPathJS)) {
      webpackAdminConfig = require(path.resolve(adminConfigPathJS));
    } else {
      webpackAdminConfig = require(path.resolve(adminConfigPathTS));
    }

    if (_.isFunction(webpackAdminConfig)) {
      // Expose the devServer configuration
      if (config.devServer) {
        webpackConfig.devServer = config.devServer;
      }

      webpackConfig = webpackAdminConfig(webpackConfig, webpack);

      if (!webpackConfig) {
        console.error(
          `${chalk.red('Error:')} Nothing was returned from your custom webpack configuration`
        );
        process.exit(1);
      }
    }
  }

  return webpackConfig;
};

module.exports = getCustomWebpackConfig;
