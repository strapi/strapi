'use strict';

const { green } = require('chalk');
// eslint-disable-next-line node/no-extraneous-require
const strapiAdmin = require('strapi-admin');
const loadConfiguration = require('../core/app-configuration');
const addSlash = require('../utils/addSlash');
/**
 * `$ strapi build`
 */
module.exports = async ({ clean, optimization }) => {
  const dir = process.cwd();
  const config = loadConfiguration(dir);

  const adminPath = config.get('server.admin.path', '/admin');
  const adminBackend = config.get('server.admin.build.backend', '/');

  console.log(`Building your admin UI with ${green(config.environment)} configuration ...`);

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
        backend: adminBackend,
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
