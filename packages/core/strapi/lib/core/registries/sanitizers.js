'use strict';

const _ = require('lodash');

const sanitizersRegistry = () => {
  const sanitizers = {
    'content-api': {
      input: [],
      output: [],
    },
  };

  return {
    get(path) {
      return _.get(sanitizers, path);
    },
    add(path, sanitizer) {
      this.get(path).push(sanitizer);
    },
    has(path) {
      return _.has(sanitizers, path);
    },
  };
};

module.exports = sanitizersRegistry;
