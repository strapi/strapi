const path = require('path');
const glob = require('./glob');
const _ = require('lodash');
const filePathToPath = require('./filepath-to-prop-path');

module.exports = async (
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
