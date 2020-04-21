'use strict';

const _ = require('lodash');

function env(key, defaultValue = undefined) {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

const utils = {
  int(...args) {
    const value = env(...args);
    return typeof value === 'undefined' ? value : parseInt(value, 10);
  },

  bool(...args) {
    const value = env(...args);
    return typeof value === 'undefined' ? value : value === 'true';
  },

  float(...args) {
    const value = env(...args);
    return typeof value === 'undefined' ? value : parseFloat(value);
  },

  json(key, val) {
    const value = env(key, val);
    try {
      return typeof value === 'undefined' ? value : JSON.parse(value);
    } catch (error) {
      throw new Error(`Invalid json environment variable ${key}: ${error.message}`);
    }
  },

  array(...args) {
    let value = env(...args);

    if (typeof value === 'undefined') {
      return value;
    }

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.substring(1, value.length - 1);
    }

    return value.split(',').map(v => {
      return _.trim(_.trim(v, ' '), '"');
    });
  },

  date(...args) {
    const value = env(...args);
    return typeof value === 'undefined' ? value : new Date(value);
  },
};

Object.assign(env, utils);

module.exports = env;
