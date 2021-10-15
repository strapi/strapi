'use strict';

const { isString, isPlainObject } = require('lodash');

const regex = /\$\{[^()]*\}/g;
const excludeConfigPaths = ['info.scripts'];

/**
 * Allow dynamic config values through the native ES6 template string function.
 * @param {any} obj
 * @param {string=} configPath
 */
const templateConfiguration = (obj, configPath = '') => {
  /**
   * @type {Record<string, any>}
   */
  const template = {};

  // Allow values which looks like such as an ES6 literal string without parenthesis inside (aka function call).
  // Exclude config with conflicting syntax (e.g. npm scripts).
  Object.keys(obj).reduce((acc, key) => {
    if (isPlainObject(obj[key]) && !isString(obj[key])) {
      acc[key] = templateConfiguration(obj[key], `${configPath}.${key}`);
    } else if (
      isString(obj[key]) &&
      !excludeConfigPaths.includes(configPath.substr(1)) &&
      obj[key].match(regex) !== null
    ) {
      // eslint-disable-next-line prefer-template
      acc[key] = eval('`' + obj[key] + '`');
    } else {
      acc[key] = obj[key];
    }

    return acc;
  }, template);

  return template;
};

module.exports = templateConfiguration;
