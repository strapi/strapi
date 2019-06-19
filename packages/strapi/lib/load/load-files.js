'use strict';

const path = require('path');
const glob = require('./glob');
const _ = require('lodash');
const filePathToPath = require('./filepath-to-prop-path');

/**
 * Returns an Object build from a list of files matching a glob pattern in a directory
 * It builds a tree structure ressembling the folder structure in dir
 * @param {string} dir - Directory to load
 * @param {string} pattern - Glob pattern to search for
 * @param {Object} options - Options
 * @param {Function} options.requireFn - Function that will require the matches files
 * @param {Function} options.shouldUseFileNameAsKey - Weather to use the filename as a key in the Object path or not
 * @param {Object} options.globArgs - extra glob function arguments
 */
const loadFiles = async (
  dir,
  pattern,
  {
    requireFn = require,
    shouldUseFileNameAsKey = () => true,
    globArgs = {},
  } = {}
) => {
  const root = {};
  const files = await glob(pattern, { cwd: dir, ...globArgs });

  for (let file of files) {
    const absolutePath = path.resolve(dir, file);

    // load module
    delete require.cache[absolutePath];
    const mod = requireFn(absolutePath);

    const propPath = filePathToPath(file, shouldUseFileNameAsKey(file));

    if (propPath.length === 0) _.merge(root, mod);
    _.merge(root, _.setWith({}, propPath, mod, Object));
  }

  return root;
};

module.exports = loadFiles;
