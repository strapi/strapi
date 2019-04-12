'use strict';

const path = require('path');
const loadConfig = require('../load/load-config-files');
const glob = require('../load/glob');
const filePathToPath = require('../load/filepath-to-prop-path');

module.exports = async function({ appPath }) {
  const extensionsDir = path.resolve(appPath, 'extensions');

  const overwrites = await loadOverwrites(extensionsDir);
  const configs = await loadConfig(extensionsDir, '*/config/**/*.+(js|json)');

  return {
    overwrites,
    configs,
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
