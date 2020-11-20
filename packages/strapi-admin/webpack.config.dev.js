'use strict';

const path = require('path');
const webpackConfig = require('./webpack.config.js');

module.exports = () => {
  const entry = path.join(__dirname, 'admin', 'src', 'app.js');
  const dest = path.join(__dirname, 'build');
  const env = 'development';
  const options = {
    backend: 'http://localhost:1337',
    publicPath: '/admin/',
  };

  const args = {
    entry,
    dest,
    env,
    options,
    useEE: process.env.STRAPI_DISABLE_EE === 'true' ? false : true,
  };

  return {
    ...webpackConfig(args),
    devServer: {
      port: 4000,
      clientLogLevel: 'none',
      quiet: true,
      historyApiFallback: {
        index: '/admin/',
        disableDotRule: true,
      },
      open: false,
      openPage: '/admin',
    },
  };
};
