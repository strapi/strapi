'use strict';

// From https://github.com/tleunen/babel-plugin-module-resolver/blob/master/src/utils.js

const path = require('path');
const resolve = require('resolve');

const nodeResolvePath = (modulePath, basedir, extensions) => {
  try {
    return resolve.sync(modulePath, { basedir, extensions });
  } catch (e) {
    return null;
  }
};

const toPosixPath = (modulePath) => {
  return modulePath.replace(/\\/g, '/');
};

const isRelativePath = (nodePath) => {
  return nodePath.match(/^\.?\.\//);
};

const stripExtension = (modulePath, stripExtensions) => {
  let name = path.basename(modulePath);
  stripExtensions.some((extension) => {
    if (name.endsWith(extension)) {
      name = name.slice(0, name.length - extension.length);
      return true;
    }
    return false;
  });
  return name;
};

const replaceExtension = (modulePath, opts) => {
  const filename = stripExtension(modulePath, opts.extensions);
  return path.join(path.dirname(modulePath), filename);
};

const toLocalPath = (modulePath) => {
  let localPath = modulePath.replace(/\/index$/, ''); // remove trailing /index

  if (!isRelativePath(localPath)) {
    localPath = `./${localPath}`; // insert `./` to make it a relative path
  }

  return localPath;
};

module.exports = {
  nodeResolvePath,
  replaceExtension,
  stripExtension,
  toPosixPath,
  toLocalPath,
  isRelativePath,
};
