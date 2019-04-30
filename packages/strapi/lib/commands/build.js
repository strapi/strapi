'use strict';

const path = require('path');
const _ = require('lodash');
const { green } = require('chalk');
const strapiAdmin = require('strapi-admin');
const { cli } = require('strapi-utils');
const strapi = require('../index');

// build script shoul only run in production mode
module.exports = ({ dir = '' }) => {
  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`
    );
  }

  const appPath = path.join(process.cwd(), dir);

  const app = strapi({ appPath });

  // prepare the app => load the configurations
  return app
    .load()
    .then(() => {
      console.log(
        `Building your admin UI with ${green(
          app.config.environment
        )} configuration ...`
      );

      const adminPath = _.get(
        app.config.currentEnvironment.server,
        'admin.path',
        'admin'
      );

      return strapiAdmin.build({
        dir: process.cwd(),
        // front end build env is always production for now
        env: 'production',
        options: {
          backend: app.config.url,
          publicPath: path.join('/', adminPath, '/'),
        },
      });
    })
    .then(() => {
      console.log('Compilation successfull');
      process.exit();
    })
    .catch(err => {
      console.log('Compilation failed');
      console.error(err);
    });
};
