'use strict';

// From https://github.com/tleunen/babel-plugin-module-resolver/blob/master/src/mapToRelative.js

const path = require('path');

const { toPosixPath } = require('./utils');

module.exports = function mapToRelative(cwd, currentFile, module) {
  let from = path.dirname(currentFile);
  let to = path.normalize(module);

  from = path.resolve(cwd, from);
  to = path.resolve(cwd, to);

  const moduleMapped = path.relative(from, to);

  return toPosixPath(moduleMapped);
};
