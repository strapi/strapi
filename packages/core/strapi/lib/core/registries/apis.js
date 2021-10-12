'use strict';

/**
 * @typedef {import('types').Strapi} Strapi
 */

const { has } = require('lodash/fp');
const { createCoreApi } = require('../../core-api');

/**
 * @param {Strapi} strapi
 */
const apisRegistry = strapi => {
  /**
   * @type {Record<string, any>}
   */
  const apis = {};

  return {
    /**
     * @param {string} name
     */
    get(name) {
      return apis[name];
    },
    getAll() {
      return apis;
    },
    /**
     * @param {string} apiName
     * @param {any=} apiConfig
     */
    add(apiName, apiConfig) {
      if (has(apiName, apis)) {
        throw new Error(`API ${apiName} has already been registered.`);
      }

      const apiInstance = strapi.container.get('modules').add(`api::${apiName}`, apiConfig);

      for (const ctName in apiInstance.contentTypes || {}) {
        const contentType = apiInstance.contentTypes[ctName];

        const { service, controller } = createCoreApi({
          model: contentType,
          api: apiInstance,
          strapi,
        });

        strapi.container.get('services').set(`api::${apiName}.${ctName}`, service);
        strapi.container.get('controllers').set(`api::${apiName}.${ctName}`, controller);
      }

      apis[apiName] = apiInstance;

      return apis[apiName];
    },
  };
};

module.exports = apisRegistry;
