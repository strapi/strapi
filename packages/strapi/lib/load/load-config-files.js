'use strict';

const loadFiles = require('./load-files');
const requireFileAndParse = require('./require-file-parse');
const checkReservedFilename = require('./check-reserved-filename');

/**
 * @param {string} dir - directory from which to load configs
 * @param {string} pattern - glob pattern to search for config files
 */
const laodConfigFiles = (dir, pattern = 'config/**/*.+(js|json)') =>
  loadFiles(dir, pattern, {
    requireFn: requireFileAndParse,
    shouldUseFileNameAsKey: checkReservedFilename,
    globArgs: {
      // used to load .init.json at first startup
      dot: true,
    },
  });

module.exports = laodConfigFiles;
