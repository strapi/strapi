const path = require('path');
const glob = require('./glob');
const _ = require('lodash');

const filePathToPath = (fileP, useFileNameAsKey = true) => {
  const prop = path
    .normalize(fileP)
    .replace(/(.settings|.json|.js)/g, '')
    .toLowerCase()
    .split('/')
    .join('.')
    .split('.');

  return useFileNameAsKey === true ? prop : prop.slice(0, -1);
};

module.exports = async (
  dir,
  pattern,
  { requireFn = require, shouldUseFileNameAsKey = () => true } = {}
) => {
  const root = {};
  const files = await glob(pattern, { cwd: dir });

  for (let file of files) {
    // TODO: need to figure out the need for clearing the cache
    delete require.cache[path.resolve(dir, file)];
    const mod = requireFn(path.resolve(dir, file));
    const propPath = filePathToPath(file, shouldUseFileNameAsKey(file));

    if (propPath.length === 0) _.merge(root, mod);
    _.merge(root, _.setWith({}, propPath, mod, Object));
  }

  return root;
};
