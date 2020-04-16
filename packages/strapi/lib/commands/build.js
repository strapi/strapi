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
module.exports = async ({ clean, optimization }) => {
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

  console.log(`Building your admin UI with ${green(env)} configuration ...`);

  if (clean) {
    await strapiAdmin.clean({ dir });
  }

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
