'use strict';

const { join, extname, basename } = require('path');
const fse = require('fs-extra');

module.exports = function loadFunctions(dir) {
  const functions = {};

  if (!fse.pathExistsSync(dir)) {
    return functions;
  }

  const paths = fse.readdirSync(dir, { withFileTypes: true });

  for (const fd of paths) {
    const { name } = fd;
    const fullPath = join(dir, name);

    if (fd.isDirectory()) {
      functions[name] = loadFunctions(fullPath);
    } else if (fd.isFile() && extname(name) === '.js') {
      const key = basename(name, '.js');
      functions[key] = require(fullPath);
    }
  }

  return functions;
};
