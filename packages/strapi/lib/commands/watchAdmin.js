/* eslint-disable no-useless-escape */
const path = require('path');
// eslint-disable-next-line node/no-extraneous-require
const strapiAdmin = require('strapi-admin');
const _ = require('lodash');
const { getConfigUrls } = require('strapi-utils');

const loadConfigFile = require('../load/load-config-files');
const addSlash = require('../utils/addSlash');

module.exports = async function() {
  const dir = process.cwd();
  const envConfigDir = path.join(dir, 'config', 'environments', 'development');
  const conf = await loadConfigFile(envConfigDir, 'server.+(js|json)');
  const { serverUrl, adminPath } = getConfigUrls(conf, true);

  const adminPort = _.get(conf, 'admin.port', 8000);
  const adminHost = _.get(conf, 'admin.host', 'localhost');
  const adminWatchIgnoreFiles = _.get(conf, 'admin.watchIgnoreFiles', []);

  strapiAdmin.watchAdmin({
    dir,
    port: adminPort,
    host: adminHost,
    options: {
      backend: serverUrl,
      publicPath: addSlash(adminPath),
      watchIgnoreFiles: adminWatchIgnoreFiles,
    },
  });
};
