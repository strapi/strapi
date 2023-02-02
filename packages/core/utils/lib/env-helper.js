'use strict';

const _ = require('lodash');

function env(key, defaultValue) {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

const utils = {
  int(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue;
    }

    const value = process.env[key];
    return parseInt(value, 10);
  },

  float(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue;
    }

    const value = process.env[key];
    return parseFloat(value);
  },

  bool(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue;
    }

    const value = process.env[key];
    return value === 'true';
  },

  json(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue;
    }

    const value = process.env[key];
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`Invalid json environment variable ${key}: ${error.message}`);
    }
  },

  array(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue;
    }

    let value = process.env[key];

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.substring(1, value.length - 1);
    }

    return value.split(',').map((v) => {
      return _.trim(_.trim(v, ' '), '"');
    });
  },

  date(key, defaultValue) {
    if (!_.has(process.env, key)) {
      return defaultValue;
    }

    const value = process.env[key];
    return new Date(value);
  },
};

Object.assign(env, utils);

module.exports = env;
