'use strict';

const findPackagePath = require('../load/package-path');
const loadFiles = require('../load/load-files');
const loadConfig = require('../load/load-config-files');

module.exports = async () => {
  const adminPath = findPackagePath('strapi-admin');

  const [files, config] = await Promise.all([
    loadFiles(adminPath, '!(config|node_modules|scripts)/*.*(js|json)'),
    loadConfig(adminPath),
  ]);

  return Object.assign({}, config, files);
};
