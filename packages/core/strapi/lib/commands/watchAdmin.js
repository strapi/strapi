'use strict';

const path = require('path');
const strapiAdmin = require('@strapi/admin');
const tsUtils = require('@strapi/typescript-utils');
const { getConfigUrls, getAbsoluteServerUrl } = require('@strapi/utils');

const getEnabledPlugins = require('../core/loaders/plugins/get-enabled-plugins');
const addSlash = require('../utils/addSlash');
const strapi = require('../index');

module.exports = async function({ browser }) {
  const currentDirectory = process.cwd();

  const isTSProject = await tsUtils.isUsingTypeScript(currentDirectory);
  const buildDestDir = isTSProject ? path.join(currentDirectory, 'dist') : currentDirectory;

  const strapiInstance = strapi({
    distDir: buildDestDir,
    autoReload: true,
    serveAdminPanel: false,
  });

  const plugins = await getEnabledPlugins(strapiInstance);

  const { adminPath } = getConfigUrls(strapiInstance.config, true);

  const adminPort = strapiInstance.config.get('admin.port', 8000);
  const adminHost = strapiInstance.config.get('admin.host', 'localhost');

  const backendURL = getAbsoluteServerUrl(strapiInstance.config, true);

  strapiAdmin.watchAdmin({
    appDir: currentDirectory,
    buildDestDir,
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
