'use strict';

// Widely inspired from https://github.com/tleunen/babel-plugin-module-resolver/tree/master/src

const transformImport = require('./transformers/import');
const normalizeOptions = require('./normalizeOptions');

const importVisitors = {
  ImportDeclaration: transformImport,
};

const visitor = {
  Program: {
    enter(programPath, state) {
      programPath.traverse(importVisitors, state);
    },
    exit(programPath, state) {
      programPath.traverse(importVisitors, state);
    },
  },
};

module.exports = ({ types: t }) => {
  return {
    name: 'module-resolver',
    visitor,

    pre(file) {
      this.types = t;

      const currentFile = file.opts.filename;

      this.normalizedOpts = normalizeOptions(currentFile, this.opts);

      this.moduleResolverVisited = new Set();
    },

    post() {
      this.moduleResolverVisited.clear();
    },
  };
};
