'use strict';

const path = require('path');
const _ = require('lodash');
const { green } = require('chalk');
const strapiAdmin = require('strapi-admin');
const { cli } = require('strapi-utils');
const strapi = require('../index');
const ora = require('ora');

// build script shoul only run in production mode
module.exports = () => {
  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`
    );
  }

  const loader = ora();

  const app = strapi();

  // prepare the app => load the configurations
  return app
    .load()
    .then(() => {
      loader.start(
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
      loader.succeed('Compilation successfull');
      process.exit();
    })
    .catch(err => {
      loader.failed('Compilation failed');
      console.error(err);
    });
};
