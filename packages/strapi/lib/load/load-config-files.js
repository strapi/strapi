const _ = require('lodash');
const loadFiles = require('./load-files');
const requireFileAndParse = require('./require-file-parse');

/**
 * @param {string} dir - directory from which to load configs
 * @param {string} pattern - glob pattern to search for config files
 */
const laodConfigFiles = (dir, pattern = 'config/**/*.+(js|json)') =>
  loadFiles(dir, pattern, {
    requireFn: requireFileAndParse,
    shouldUseFileNameAsKey,
    globArgs: {
      // used to load .init.json at first startup
      dot: true,
    },
  });

const shouldUseFileNameAsKey = file => {
  return _.some(prefixedPaths, e => file.indexOf(`config/${e}`) >= 0)
    ? true
    : false;
};

// files to load with filename key
const prefixedPaths = [
  ...['staging', 'production', 'development'].reduce((acc, env) => {
    return acc.concat(
      `environments/${env}/database`,
      `environments/${env}/security`,
      `environments/${env}/request`,
      `environments/${env}/response`,
      `environments/${env}/server`
    );
  }, []),
  'functions',
  'policies',
  'locales',
  'hook',
  'middleware',
  'language',
  'queries',
  'layout',
];

module.exports = laodConfigFiles;
