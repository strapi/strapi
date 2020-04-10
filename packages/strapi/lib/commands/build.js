'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { green, yellow } = require('chalk');
// eslint-disable-next-line node/no-extraneous-require
const strapiAdmin = require('strapi-admin');
const loadConfigFile = require('../load/load-config-files');
const addSlash = require('../utils/addSlash');
/**
 * `$ strapi build`
 */
module.exports = async ({ optimization }) => {
  const dir = process.cwd();
  const env = process.env.NODE_ENV || 'development';

  const envConfigDir = path.join(dir, 'config', 'environments', env);

  if (!fs.existsSync(envConfigDir)) {
    console.log(
      `Missing environment config for env: ${green(env)}.\nMake sure the directory ${yellow(
        `./config/environments/${env}`
      )} exists`
    );
    process.exit(1);
  }

  const conf = await loadConfigFile(envConfigDir, 'server.+(js|json)');

  let serverUrl = _.get(conf, 'server.url', `http://${conf.host}:${conf.port}`);
  serverUrl = new URL(serverUrl).toString();
  serverUrl = _.trim(serverUrl, '/');

  let adminPath = _.get(conf, 'admin.url', '/admin');
  adminPath = _.trim(adminPath, '/');
  if (adminPath.startsWith('http')) {
    adminPath = new URL(adminPath).pathname;
  } else {
    adminPath = new URL(`${serverUrl}/${adminPath}`).pathname;
  }

  console.log(`Building your admin UI with ${green(env)} configuration ...`);

  return strapiAdmin
    .build({
      dir,
      // front end build env is always production for now
      env: 'production',
      optimize: optimization,
      options: {
        backend: serverUrl,
        publicPath: addSlash(adminPath),
      },
    })
    .then(() => {
      process.exit();
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
};
