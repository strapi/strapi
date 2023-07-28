'use strict';

const strapiAdmin = require('@strapi/admin');
const { getConfigUrls, getAbsoluteServerUrl } = require('@strapi/utils');

const getEnabledPlugins = require('../../../core/loaders/plugins/get-enabled-plugins');
const addSlash = require('../../../utils/addSlash');
const strapi = require('../../../index');

module.exports = async ({ browser }) => {
  const appContext = await strapi.compile();

  const strapiInstance = strapi({
    ...appContext,
    autoReload: true,
    serveAdminPanel: false,
  });

  const plugins = await getEnabledPlugins(strapiInstance);

  const { adminPath } = getConfigUrls(strapiInstance.config, true);

  const adminPort = strapiInstance.config.get('admin.port', 8000);
  const adminHost = strapiInstance.config.get('admin.host', 'localhost');

  const backendURL = getAbsoluteServerUrl(strapiInstance.config, true);

  strapiAdmin.watchAdmin({
    appDir: appContext.appDir,
    buildDestDir: appContext.distDir,
    plugins,
    port: adminPort,
    host: adminHost,
    browser,
    options: {
      backend: backendURL,
      adminPath: addSlash(adminPath),
    },
  });
};
