'use strict';

const _ = require('lodash');
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
    add(name, apiConfig) {
      if (has(name, apis)) {
        throw new Error(`API ${name} has already been registered.`);
      }

      for (const ctName in apiConfig.contentTypes || {}) {
        const contentType = apiConfig.contentTypes[ctName];

        const { service, controller } = createCoreApi({
          model: contentType,
          api: apiConfig,
          strapi,
        });

        _.set(apiConfig, ['services', ctName], service);
        _.set(apiConfig, ['controllers', ctName], controller);
      }

      const moduleInstance = strapi.container.get('modules').add(`api::${name}`, apiConfig);
      apis[name] = moduleInstance;

      return apis[name];
    },
  };
};

module.exports = apisRegistry;
