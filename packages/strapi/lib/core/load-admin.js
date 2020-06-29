'use strict';

const _ = require('lodash');

const findPackagePath = require('../load/package-path');
const loadFiles = require('../load/load-files');
const loadConfig = require('../load/load-config-files');

module.exports = async strapi => {
  const adminPath = findPackagePath('strapi-admin');

  const [files, config] = await Promise.all([
    loadFiles(adminPath, '!(config|node_modules|scripts)/*.*(js|json)'),
    loadConfig(adminPath),
  ]);

  // set admin config in strapi.config.server.admin
  const userAdminConfig = strapi.config.get('server.admin');
  strapi.config.set('server.admin', _.merge(config.config, userAdminConfig));

  return Object.assign({}, config, files);
};
