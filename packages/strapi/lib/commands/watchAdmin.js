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
  const conf = await loadConfigFile(envConfigDir, 'server.+(js|json)');

  // Defines serverUrl value
  let serverUrl = _.get(conf, 'url', '');
  serverUrl = _.trim(serverUrl, '/ ');
  if (typeof serverUrl !== 'string') {
    console.log('Invalid server url config. Make sure the url is a string.');
    process.exit(1);
  }
  if (serverUrl.startsWith('http')) {
    try {
      serverUrl = _.trim(new URL(conf.url).toString(), '/');
    } catch (e) {
      console.log('Invalid server url config. Make sure the url defined in server.js is valid.');
      process.exit(1);
    }
  } else if (serverUrl !== '') {
    serverUrl = `/${serverUrl}`;
  }

  // Defines adminUrl value
  let adminUrl = _.get(conf, 'admin.url', '/admin');
  adminUrl = _.trim(adminUrl, '/ ');
  if (typeof adminUrl !== 'string' || adminUrl === '') {
    throw new Error('Invalid admin url config. Make sure the url is a non-empty string.');
  }
  if (adminUrl.startsWith('http')) {
    try {
      adminUrl = _.trim(new URL(adminUrl).toString(), '/');
    } catch (e) {
      strapi.stopWithError(
        e,
        'Invalid admin url config. Make sure the url defined in server.js is valid.'
      );
    }
  } else {
    adminUrl = `${serverUrl}/${adminUrl}`;
  }

  // Defines adminPath value
  let adminPath = adminUrl;
  if (adminPath.startsWith('http')) {
    adminPath = new URL(adminUrl).pathname;
  }

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
