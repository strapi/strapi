/* eslint-disable no-useless-escape */
const path = require('path');
// eslint-disable-next-line node/no-extraneous-require
const strapiAdmin = require('strapi-admin');
const _ = require('lodash');

const loadConfigFile = require('../load/load-config-files');
const addSlash = require('../utils/addSlash');

module.exports = async function() {
  const dir = process.cwd();
  const envConfigDir = path.join(dir, 'config', 'environments', 'development');
  const serverConfig = await loadConfigFile(envConfigDir, 'server.+(js|json)');

  const port = _.get(serverConfig, 'port', 1337);
  const host = _.get(serverConfig, 'host', 'localhost');
  const adminPort = _.get(serverConfig, 'admin.port', 8000);
  const adminHost = _.get(serverConfig, 'admin.host', 'localhost');
  const adminBackend = _.get(
    serverConfig,
    'admin.build.backend',
    `http://${host}:${port}`
  );
  const adminPath = _.get(serverConfig, 'admin.path', '/admin');
  const adminWatchIgnoreFiles = _.get(
    serverConfig,
    'admin.watchIgnoreFiles',
    []
  );

  strapiAdmin.watchAdmin({
    dir,
    port: adminPort,
    host: adminHost,
    options: {
      backend: adminBackend,
      publicPath: addSlash(adminPath),
      watchIgnoreFiles: adminWatchIgnoreFiles,
    },
  });
};
