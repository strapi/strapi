'use strict';

const { has } = require('lodash/fp');
const { createCoreApi } = require('../../core-api');

const apisRegistry = strapi => {
  const apis = {};

  return {
    get(name) {
      return apis[name];
    },
    getAll() {
      return apis;
    },
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
