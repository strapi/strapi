'use strict';

const _ = require('lodash');

const validatorsRegistry = () => {
  const validators = {};

  return {
    get(path) {
      return _.get(validators, path, []);
    },
    add(path, sanitizer) {
      this.get(path).push(sanitizer);
      return this;
    },
    set(path, value = []) {
      _.set(validators, path, value);
      return this;
    },
    has(path) {
      return _.has(validators, path);
    },
  };
};

module.exports = validatorsRegistry;
