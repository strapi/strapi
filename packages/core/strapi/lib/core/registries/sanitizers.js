'use strict';

const _ = require('lodash');

const sanitizersRegistry = () => {
  const sanitizers = {};

  return {
    get(path) {
      return _.get(sanitizers, path, []);
    },
    add(path, sanitizer) {
      this.get(path).push(sanitizer);
      return this;
    },
    set(path, value = []) {
      _.set(sanitizers, path, value);
      return this;
    },
    has(path) {
      return _.has(sanitizers, path);
    },
  };
};

module.exports = sanitizersRegistry;
