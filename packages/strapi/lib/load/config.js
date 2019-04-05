const path = require('path');
const slash = require('slash');
const _ = require('lodash');

const requireFile = require('./require-file');
const glob = require('./glob');

const setValue = (obj, rootPath, source) => {
  if (rootPath === null) {
    return _.assign(obj, source);
  }

  const propPath = slash(rootPath.toLowerCase()).split('/');
  if (propPath.length === 0) {
    return _.assign(obj, source);
  }

  _.setWith(obj, propPath, source, Object);
};

const prefixedPath = [
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

/**
 * Loads app config from a dir
 * @param {Object} options - Options
 * @param {string} options.dir - config dir to load
 */
module.exports = async dir => {
  let root = {};

  const files = await glob('**/*.+(js|json)', {
    cwd: dir,
  });

  files.forEach(file => {
    const m = requireFile(path.resolve(dir, file));

    if (_.some(prefixedPath, e => slash(file).startsWith(e))) {
      const rootPath = path.join(
        path.dirname(file),
        path.basename(file, path.extname(file))
      );

      setValue(root, rootPath, m);
    } else {
      const rootPath = path.dirname(file);
      setValue(root, rootPath === '.' ? null : rootPath, m);
    }
  });

  return root;
};
