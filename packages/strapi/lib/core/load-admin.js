'use strict';

const _ = require('lodash');
const findPackagePath = require('../load/package-path');
const loadFiles = require('../load/load-files');
const loadConfig = require('../load/load-config-files');

module.exports = async () => {
  const adminPath = findPackagePath('strapi-admin');
  const [files, config] = await Promise.all([
    loadFiles(adminPath, '!(config|node_modules|test|ee|scripts)/*.*(js|json)'),
    loadConfig(adminPath),
  ]);

  let eeFiles = {};
  let eeConfig = {};
  if (process.env.STRAPI_DISABLE_EE !== 'true') {
    const eeAdminPath = `${adminPath}/ee`;
    [eeFiles, eeConfig] = await Promise.all([
      loadFiles(eeAdminPath, '!(config|test)/*.*(js|json)'),
      loadConfig(eeAdminPath),
    ]);
  }

  return _.merge({}, config, eeConfig, files, eeFiles);
};
