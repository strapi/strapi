const path = require('path');
const shell = require('shelljs');

const pwd = shell.pwd();

const isDevelopmentMode = path.resolve(pwd.stdout).indexOf('strapi-admin') !== -1;
const isSetup = process.env.IS_MONOREPO || false;
const appPath = isDevelopmentMode ? path.resolve(process.env.PWD || process.cwd(), '..') : path.resolve(pwd.stdout, '..');

// Load the app configurations only when :
// - starting the app in dev mode
// - building the admin from an existing app (`npm run setup` at the root of the project)
if (!isSetup) {
  const strapi = require(path.join(appPath, 'node_modules', 'strapi'));
  strapi.config.appPath = appPath;
  strapi.log.level = 'silent';

  (async () => {
    await strapi.load({
      environment: process.env.NODE_ENV,
    });

    // Force exit process if an other process doen't exit during Strapi load.
    process.exit();
  })();
}

