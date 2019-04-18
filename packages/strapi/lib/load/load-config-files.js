const _ = require('lodash');
const loadFiles = require('./load-files');
const requireFileAndParse = require('./require-file-parse');

module.exports = (dir, pattern = 'config/**/*.+(js|json)') =>
  loadFiles(dir, pattern, {
    requireFn: requireFileAndParse,
    shouldUseFileNameAsKey,
    globArgs: {
      dot: true,
    },
  });

const shouldUseFileNameAsKey = file => {
  return _.some(prefixedPaths, e => file.indexOf(`config/${e}`) >= 0)
    ? true
    : false;
};
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
