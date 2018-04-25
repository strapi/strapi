const path = require('path');
const shell = require('shelljs');

const pwd = shell.pwd();
const isDevelopmentMode = path.resolve(pwd.stdout).indexOf('strapi-admin') !== -1;
const appPath = isDevelopmentMode ? path.resolve(process.env.PWD, '..') : path.resolve(pwd.stdout, '..');

const strapi = require(path.join(appPath, 'node_modules', 'strapi'));
strapi.config.appPath = appPath;
strapi.log.level = 'silent';

(async () => {
  await strapi.load({
    environment: process.env.NODE_ENV,
  });
})();
