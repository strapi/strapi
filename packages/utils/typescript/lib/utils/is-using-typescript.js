'use strict';

const path = require('path');
const fse = require('fs-extra');

const getConfigPath = require('./get-config-path');

/**
 * Checks if `dir` is a using TypeScript (whether there is a tsconfig file or not)
 *
 * In production mode, if the compiled output directory (dist/config/) exists,
 * the project is considered a TypeScript project even without tsconfig.json or
 * source files. This allows Docker images to ship only the compiled output.
 *
 * @param {string} dir
 * @param {string | undefined} filename
 * @returns {Promise<boolean>}
 */
module.exports = async (dir, filename = undefined) => {
  // Production shortcut: detect a compiled TypeScript project by the presence
  // of dist/config/ so that tsconfig.json and src/ are not required at runtime.
  if (process.env.NODE_ENV === 'production') {
    const distConfig = path.join(dir, 'dist', 'config');

    if (await fse.pathExists(distConfig)) {
      return true;
    }
  }

  const filePath = getConfigPath(dir, { filename });

  return fse.pathExists(filePath);
};
