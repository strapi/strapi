'use strict';

const path = require('path');
const loadConfig = require('../load/load-config-files');
const glob = require('../load/glob');
const filePathToPath = require('../load/filepath-to-prop-path');

const overwritableFoldersGlob = 'models';

module.exports = async function({ appPath }) {
  const extensionsDir = path.resolve(appPath, 'extensions');

  const overwrites = await loadOverwrites(extensionsDir);
  const configs = await loadConfig(extensionsDir, '*/config/**/*.+(js|json)');

  return {
    overwrites,
    configs,
  };
};

// returns a list of path and module to overwrite
const loadOverwrites = async extensionsDir => {
  const files = await glob(`*/${overwritableFoldersGlob}/*.*(js|json)`, {
    cwd: extensionsDir,
  });

  return files.map(file => {
    const mod = require(path.resolve(extensionsDir, file));
    const propPath = filePathToPath(file);

    return {
      path: propPath,
      mod,
    };
  });
};
