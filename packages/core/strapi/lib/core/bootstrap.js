'use strict';

const { getConfigUrls } = require('@strapi/utils');
const fse = require('fs-extra');

module.exports = async function({ strapi }) {
  strapi.config.port = strapi.config.get('server.port') || strapi.config.port;
  strapi.config.host = strapi.config.get('server.host') || strapi.config.host;

  const { serverUrl, adminUrl, adminPath } = getConfigUrls(strapi.config);

  strapi.config.server = strapi.config.server || {};
  strapi.config.server.url = serverUrl;
  strapi.config.admin.url = adminUrl;
  strapi.config.admin.path = adminPath;

  // check if we should serve admin panel
  const shouldServeAdmin = strapi.config.get(
    'admin.serveAdminPanel',
    strapi.config.get('serveAdminPanel')
  );

  if (!shouldServeAdmin) {
    strapi.config.serveAdminPanel = false;
  }

  // ensure public repository exists
  if (!(await fse.pathExists(strapi.dirs.static.public))) {
    throw new Error(
      `The public folder (${strapi.dirs.static.public}) doesn't exist or is not accessible. Please make sure it exists.`
    );
  }
};
