'use strict';

const path = require('path');
const { green } = require('chalk');
const strapiAdmin = require('strapi-admin');
const { cli } = require('strapi-utils');

process.env.NODE_ENV = 'production';
// build script shoul only run in production mode
module.exports = ({ dir = '', env }) => {
  // Check that we're in a valid Strapi project.
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi start')} can only be used inside a Strapi project.`
    );
  }

  const appPath = path.join(process.cwd(), dir);

  console.log(`Building your app with ${green(env)} configuration`);

  // Require server configurations
  const server = require(path.resolve(
    appPath,
    'config',
    'environments',
    env,
    'server.json'
  ));

  return strapiAdmin.build({
    dir: process.cwd(),
    env: 'production',
  });
};
