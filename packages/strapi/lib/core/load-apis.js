'use strict';

const { join } = require('path');
const { existsSync } = require('fs-extra');
const _ = require('lodash');
const loadFiles = require('../load/load-files');
const loadConfig = require('../load/load-config-files');
const getSupportedFileExtensions = require('../utils/getSupportedFileExtensions');

module.exports = async ({ dir, config }) => {
  const apiDir = join(dir, 'api');
  const bootstrap = config.get('server.loader.bootstrap', _.noop);

  if (!existsSync(apiDir)) {
    throw new Error(`Missing api folder. Please create one in your app root directory`);
  }

  // Bootstrap before loading files. Needed for loading ts-node.register()
  bootstrap();

  const fileExtensions = getSupportedFileExtensions(config);
  const apis = await loadFiles(apiDir, `*/!(config)/**/*.*(${fileExtensions}`);
  const apiConfigs = await loadConfig(apiDir, `*/config/**/*.*(${fileExtensions}`);

  return _.merge(apis, apiConfigs);
};
