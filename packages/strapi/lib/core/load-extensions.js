'use strict';

const path = require('path');
const { existsSync } = require('fs-extra');
const _ = require('lodash');
const loadConfig = require('../load/load-config-files');
const loadFiles = require('../load/load-files');
const glob = require('../load/glob');
const filePathToPath = require('../load/filepath-to-prop-path');

/**
 * Loads the extensions folder
 */
module.exports = async function({ appPath }) {
  const extensionsDir = path.resolve(appPath, 'extensions');

  if (!existsSync(extensionsDir)) {
    throw new Error(
      `Missing extensions folder. Please create one in your app root directory`
    );
  }

  const configs = await loadConfig(extensionsDir, '*/config/**/*.+(js|json)');
  const controllersAndServices = await loadFiles(
    extensionsDir,
    '*/{controllers,services}/*.+(js|json)'
  );

  const overwrites = await loadOverwrites(extensionsDir);

  return {
    overwrites,
    merges: _.merge({}, configs, controllersAndServices),
  };
};

const OVERWRITABLE_FOLDERS_GLOB = 'models';
// returns a list of path and module to overwrite
const loadOverwrites = async extensionsDir => {
  const files = await glob(`*/${OVERWRITABLE_FOLDERS_GLOB}/*.*(js|json)`, {
    cwd: extensionsDir,
  });

  return files.map(file => {
    const absolutePath = path.resolve(extensionsDir, file);

    // load module
    delete require.cache[absolutePath];
    const mod = require(absolutePath);

    const propPath = filePathToPath(file);

    return {
      path: propPath,
      mod,
    };
  });
};
