'use strict';

// Dependencies.
const path = require('path');
const { map } = require('async');
const { setWith, merge, get, difference } = require('lodash');

module.exports = {
  loadFile: function(url) {
    try {
      return require(path.resolve(this.config.appPath, url));
    } catch (e) {
      return {};
    }
  },

  setConfig: function(ctx, path, type, loader) {
    const objPath = type === 'optional'
      ? this.optionalPath(path)
      : this.aggregatePath(path);

    // Direct assignation.
    if (objPath.split('.').length === 1) {
      return setWith(
        ctx,
        objPath,
        merge(get(ctx, objPath), loader(path)),
        Object
      );
    }

    // Nested assignation.
    return setWith(ctx, objPath, loader(path), Object);
  },

  setConfigAdmin: function(ctx, path, type, loader) {
    const objPath = 'admin.' + (type === 'optional'
      ? this.optionalPath(path)
      : this.aggregatePath(path));

    // Direct assignation.
    if (objPath.split('.').length === 1) {
      return setWith(
        ctx,
        objPath,
        merge(get(ctx, objPath), loader(path)),
        Object
      );
    }

    // Nested assignation.
    return setWith(ctx, objPath, loader(path), Object);
  },

  optionalPath: path => {
    return path
      .replace(/(.settings|.json|.js)/g, '')
      .split('/')
      .slice(1, path.split('/').length - 1)
      .join('.')
      .toLowerCase();
  },

  aggregatePath: path => {
    return path
      .replace(/(.settings|.json|.js)/g, '')
      .split('/')
      .slice(1)
      .join('.')
      .toLowerCase();
  },

  loadConfig: function(files) {
    const configurations = files.filter(
      p =>
        p.indexOf('environments') !== -1 ||
        p.indexOf('functions') !== -1 ||
        p.indexOf('policies') !== -1 ||
        p.indexOf('locales') !== -1
    );
    const others = difference(files, configurations);

    return Promise.all([
      new Promise((resolve, reject) => {
        map(configurations, p =>
          module.exports.setConfig(this, p, 'aggregate', this.loadFile)
        );

        resolve();
      }),
      new Promise((resolve, reject) => {
        map(others, p =>
          module.exports.setConfig(this, p, 'optional', this.loadFile)
        );

        resolve();
      })
    ]);
  }
};
