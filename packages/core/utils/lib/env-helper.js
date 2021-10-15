'use strict';

const _ = require('lodash');

/**
 * @param {string} key
 * @param {string=} defaultValue
 */
function env(key, defaultValue) {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

/**
 * @param {string} key
 * @param {number=} defaultValue
 */
env.int = (key, defaultValue) => {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  const value = process.env[key];
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  return parseInt(value, 10);
};

/**
 * @param {string} key
 * @param {number=} defaultValue
 */
env.float = (key, defaultValue) => {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  const value = process.env[key];
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  return parseFloat(value);
};

/**
 * @param {string} key
 * @param {boolean=} defaultValue
 */
env.bool = (key, defaultValue) => {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  const value = process.env[key];
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  return value === 'true';
};

/**
 * @param {string} key
 * @param {any=} defaultValue
 */
env.json = (key, defaultValue) => {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  const value = process.env[key];
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  try {
    return JSON.parse(value);
  } catch (/** @type {any} **/ error) {
    throw new Error(`Invalid json environment variable ${key}: ${error.message}`);
  }
};

/**
 * @param {string} key
 * @param {any[]=} defaultValue
 */
env.array = (key, defaultValue) => {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  let value = process.env[key];
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.substring(1, value.length - 1);
  }

  return value.split(',').map(v => {
    return _.trim(_.trim(v, ' '), '"');
  });
};

/**
 * @param {string} key
 * @param {Date=} defaultValue
 */
env.date = (key, defaultValue) => {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  const value = process.env[key];
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  return new Date(value);
};

module.exports = env;
