'use strict';

// Adapted from https://github.com/tleunen/babel-plugin-module-resolver/blob/master/src/normalizeOptions.js

const path = require('path');
const { createSelector } = require('reselect');

const defaultExtensions = ['.js'];

const normalizeRoots = (optsRoot, cwd) => {
  return Object.keys(optsRoot).reduce((acc, current) => {
    const dirPath = path.resolve(cwd, optsRoot[current]);

    acc[current] = dirPath;

    return acc;
  }, {});
};

const normalizeOptions = createSelector(
  // TODO check if needed
  currentFile => (currentFile.includes('.') ? path.dirname(currentFile) : currentFile),
  (_, opts) => opts,
  (_, opts) => {
    const cwd = process.cwd();
    const roots = normalizeRoots(opts.roots, cwd);

    return {
      cwd,
      roots,
      extensions: defaultExtensions,
    };
  }
);

module.exports = normalizeOptions;
