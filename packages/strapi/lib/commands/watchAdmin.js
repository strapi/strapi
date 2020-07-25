'use strict';

// required first because it loads env files.
const loadConfiguration = require('../core/app-configuration');

// eslint-disable-next-line node/no-extraneous-require
const strapiAdmin = require('strapi-admin');
const { getConfigUrls, getAbsoluteServerUrl } = require('strapi-utils');

const addSlash = require('../utils/addSlash');

module.exports = async function() {
  const dir = process.cwd();

  const config = loadConfiguration(dir);

  const { adminPath } = getConfigUrls(config.get('server'), true);

  const port = config.get('server.admin.port', 8000);
  const host = config.get('server.admin.host', 'localhost');

  const public = config.get('server.admin.public', host);
  const allowedHosts = config.get('server.admin.allowedHosts', []);
  const watchIgnoreFiles = config.get('server.admin.watchIgnoreFiles', []);

  strapiAdmin.watchAdmin({
    dir,
    port,
    host,
    options: {
      public,
      allowedHosts,
      watchIgnoreFiles,
      backend: getAbsoluteServerUrl(config, true),
      publicPath: addSlash(adminPath),
    },
  });
};
