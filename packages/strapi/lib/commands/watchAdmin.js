'use strict';

// required first because it loads env files.

// eslint-disable-next-line node/no-extraneous-require
const strapiAdmin = require('strapi-admin');
const { getConfigUrls, getAbsoluteServerUrl } = require('strapi-utils');
const loadConfiguration = require('../core/app-configuration');

const addSlash = require('../utils/addSlash');

module.exports = async function({ browser }) {
  const dir = process.cwd();

  const config = loadConfiguration(dir);

  const { adminPath } = getConfigUrls(config.get('server'), true);

  const adminPort = config.get('server.admin.port', 8000);
  const adminHost = config.get('server.admin.host', 'localhost');
  const adminWatchIgnoreFiles = config.get('server.admin.watchIgnoreFiles', []);

  strapiAdmin.watchAdmin({
    dir,
    port: adminPort,
    host: adminHost,
    browser,
    options: {
      backend: getAbsoluteServerUrl(config, true),
      publicPath: addSlash(adminPath),
      watchIgnoreFiles: adminWatchIgnoreFiles,
    },
  });
};
