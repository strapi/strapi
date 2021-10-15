'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 * @typedef {import('@strapi/strapi').StrapiApi} StrapiApi
 */

const { has } = require('lodash/fp');
const { createCoreApi } = require('../../core-api');

/**
 * @param {Strapi} strapi
 */
const apisRegistry = strapi => {
  /**
   * @type {StrapiApi}
   */
  // @ts-ignore
  const apis = {};

  return {
    /**
     * @template {keyof StrapiApi} T
     * @param {T} name
     */
    get(name) {
      return apis[name];
    },
    getAll() {
      return apis;
    },
    /**
     * @template {keyof StrapiApi} T
     * @param {T} apiName
     * @param {any=} apiConfig
     */
    add(apiName, apiConfig) {
      if (has(apiName, apis)) {
        throw new Error(`API ${apiName} has already been registered.`);
      }

      // @ts-ignore
      const apiInstance = strapi.container.get('modules').add(`api::${apiName}`, apiConfig);

      // @ts-ignore
      for (const ctName in apiInstance.contentTypes || {}) {
        // @ts-ignore
        const contentType = apiInstance.contentTypes[ctName];

        const { service, controller } = createCoreApi({
          model: contentType,
          api: apiInstance,
          strapi,
        });

        // @ts-ignore
        strapi.container.get('services').set(`api::${apiName}.${ctName}`, service);
        // @ts-ignore
        strapi.container.get('controllers').set(`api::${apiName}.${ctName}`, controller);
      }

      apis[apiName] = apiInstance;

      return apis[apiName];
    },
  };
};

module.exports = apisRegistry;
