'use strict';

const { green } = require('chalk');

const strapiAdmin = require('@strapi/admin');
const { getConfigUrls } = require('@strapi/utils');

const ee = require('../../utils/ee');
const addSlash = require('../../utils/addSlash');
const strapi = require('../../index');
const getEnabledPlugins = require('../../core/loaders/plugins/get-enabled-plugins');

module.exports = async ({ buildDestDir, forceBuild = true, optimization, srcDir }) => {
  const strapiInstance = strapi({
    // Directories
    appDir: srcDir,
    distDir: buildDestDir,
    // Options
    autoReload: true,
    serveAdminPanel: false,
  });

  const plugins = await getEnabledPlugins(strapiInstance);

  const env = strapiInstance.config.get('environment');
  const { serverUrl, adminPath } = getConfigUrls(strapiInstance.config, true);

  console.log(`Building your admin UI with ${green(env)} configuration...`);

  // Always remove the .cache and build folders
  await strapiAdmin.clean({ appDir: srcDir, buildDestDir });

  ee({ dir: srcDir });

  return strapiAdmin
    .build({
      appDir: srcDir,
      buildDestDir,
      // front end build env is always production for now
      env: 'production',
      forceBuild,
      plugins,
      optimize: optimization,
      options: {
        backend: serverUrl,
        adminPath: addSlash(adminPath),
      },
    })
    .then(() => {
      console.log('Admin UI built successfully');
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
};
