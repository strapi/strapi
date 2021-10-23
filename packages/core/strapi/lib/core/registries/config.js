'use strict';

/**
 * @template T
 * @typedef {import('@strapi/strapi').DeepPartial<T>} DeepPartial<T>
 */

/**
 * @typedef {import('@strapi/strapi').StrapiConfig} StrapiConfig
 */

const _ = require('lodash');

/**
 * @param {DeepPartial<StrapiConfig>} initialConfig
 */
module.exports = (initialConfig = {}) => {
  /**
   * @type {StrapiConfig}
   */
  // @ts-ignore
  const _config = Object.assign({}, initialConfig); // not deep clone because it would break some config

  return {
    ..._config, // TODO: to remove
    /**
     * @param {string} path
     * @param {any=} defaultValue
     */
    get(path, defaultValue) {
      return _.get(_config, path, defaultValue);
    },
    /**
     * @param {string} path
     * @param {any} val
     */
    set(path, val) {
      _.set(_config, path, val);
      return this;
    },
    /**
     * @param {string} path
     */
    has(path) {
      return _.has(_config, path);
    },
  };
};
