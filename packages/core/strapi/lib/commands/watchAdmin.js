'use strict';

const strapiAdmin = require('@strapi/admin');
const { getConfigUrls, getAbsoluteServerUrl } = require('@strapi/utils');

const ee = require('../utils/ee');
const addSlash = require('../utils/addSlash');
const strapi = require('../index');
const getEnabledPlugins = require('../core/loaders/plugins/get-enabled-plugins');

module.exports = async function({ browser }) {
  const dir = process.cwd();

  const strapiInstance = strapi({
    dir,
    autoReload: true,
    serveAdminPanel: false,
  });

  const plugins = await getEnabledPlugins(strapiInstance);

  const { adminPath } = getConfigUrls(strapiInstance.config, true);

  const adminPort = strapiInstance.config.get('admin.port', 8000);
  const adminHost = strapiInstance.config.get('admin.host', 'localhost');
  const adminWatchIgnoreFiles = strapiInstance.config.get('admin.watchIgnoreFiles', []);

  const backendURL = getAbsoluteServerUrl(strapiInstance.config, true);

  ee({ dir });

  strapiAdmin.watchAdmin({
    dir,
    plugins,
    port: adminPort,
    host: adminHost,
    browser,
    options: {
      backend: backendURL,
      adminPath: addSlash(adminPath),
      watchIgnoreFiles: adminWatchIgnoreFiles,
      features: ee.isEE ? ee.features.getEnabled() : [],
    },
  });
};
