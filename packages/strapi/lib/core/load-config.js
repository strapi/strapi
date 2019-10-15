'use strict';

const { join } = require('path');
const { existsSync } = require('fs-extra');
const loadConfig = require('../load/load-config-files');

module.exports = async ({ dir }) => {
  if (!existsSync(join(dir, 'config'))) {
    throw new Error(
      `Missing config folder. Please create one in your app root directory`
    );
  }

  const { config } = await loadConfig(dir);
  return config;
};
