'use strict';

const { join } = require('path');
const { existsSync } = require('fs-extra');
const _ = require('lodash');
const loadFiles = require('../load/load-files');
const loadConfig = require('../load/load-config-files');

module.exports = async ({ dir, config }) => {
  const apiDir = join(dir, 'api');
  const omitFilenamesPrefix = _.get(config, 'omitFilenamesPrefix', '');

  if (!existsSync(apiDir)) {
    throw new Error(
      `Missing api folder. Please create one in your app root directory`
    );
  }

  const filenamPrefix = omitFilenamesPrefix
    ? `[!${omitFilenamesPrefix}]*`
    : '*';

  const apis = await loadFiles(
    apiDir,
    `*/!(config)/**/${filenamPrefix}.*(js|json)`
  );
  const apiConfigs = await loadConfig(apiDir, '*/config/**/*.*(js|json)');

  return _.merge(apis, apiConfigs);
};
