'use strict';

const { has } = require('lodash/fp');
const { createService } = require('../../core-api/service');
const { createController } = require('../../core-api/controller');

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

      const api = strapi.container.get('modules').add(`api::${apiName}`, apiConfig);

      for (const ctName in api.contentTypes || {}) {
        const contentType = api.contentTypes[ctName];

        const uid = `api::${apiName}.${ctName}`;

        if (!has(contentType.modelName, api.services)) {
          const service = createService({ contentType, strapi });
          strapi.container.get('services').set(uid, service);
        }

        if (!has(contentType.modelName, api.controllers)) {
          const service = strapi.container.get('services').get(uid);

          const controller = createController({ contentType, service });
          strapi.container.get('controllers').set(uid, controller);
        }
      }

      apis[apiName] = api;

      return apis[apiName];
    },
  };
};

module.exports = apisRegistry;
