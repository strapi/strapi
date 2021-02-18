'use strict';

const assert = require('assert');
const _ = require('lodash');

module.exports = (initialConfig = {}) => {
  assert(
    typeof initialConfig === 'object' && initialConfig !== null,
    'Initial config must be an object'
  );

  const _config = _.cloneDeep(initialConfig);

  return Object.assign(_config, {
    get(path, defaultValue) {
      return _.get(_config, path, defaultValue);
    },

    set(path, val) {
      _.set(_config, path, val);
      return this;
    },

    has(path) {
      return _.has(_config, path);
    },
  });
};
