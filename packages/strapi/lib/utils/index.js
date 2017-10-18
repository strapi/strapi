'use strict';

// Dependencies.
const path = require('path');
const { map } = require('async');
const { setWith, merge, get, difference, intersection, isObject, isFunction } = require('lodash');

module.exports = {
  loadFile: function(url) {
    try {
      return require(path.resolve(this.config.appPath, url));
    } catch (e) {
      this.log.error(e);

      return {};
    }
  },

  setConfig: function(ctx, path, type, loader) {
    const objPath = type === 'optional'
      ? this.optionalPath(path)
      : this.aggregatePath(path);

    // Load value.
    const value = loader(path);
    // Merge doesn't work for none-object value and function.
    const obj = isObject(value) && !isFunction(value) ? merge(get(ctx, objPath), value) : value;

    // Assignation.
    return setWith(ctx, objPath, obj, Object);
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
      .replace(/(\.settings|.json|.js)/g, '')
      .split('/')
      .slice(1, path.split('/').length - 1)
      .join('.')
      .toLowerCase();
  },

  aggregatePath: path => {
    return path
      .replace(/(\.settings|.json|.js)/g, '')
      .split('/')
      .slice(1)
      .join('.')
      .toLowerCase();
  },

  loadConfig: function(files) {
    const aggregate = files.filter(
      p =>
        intersection(p.split('/').map(p => p.replace('.json', '')), ['environments', 'database', 'security', 'request', 'response', 'server']).length === 2 ||
        p.indexOf('functions') !== -1 ||
        p.indexOf('policies') !== -1 ||
        p.indexOf('locales') !== -1 ||
        p.indexOf('hook') !== -1 ||
        p.indexOf('middleware') !== -1 ||
        p.indexOf('language') !== -1 ||
        p.indexOf('queries') !== -1
    );
    const optional = difference(files, aggregate);

    return Promise.all([
      new Promise((resolve, reject) => {
        map(aggregate, p =>
          module.exports.setConfig(this, p, 'aggregate', this.loadFile)
        );

        resolve();
      }),
      new Promise((resolve, reject) => {
        map(optional, p =>
          module.exports.setConfig(this, p, 'optional', this.loadFile)
        );

        resolve();
      })
    ]);
  }
};
