'use strict';

const { has } = require('lodash/fp');
const { createCoreApi } = require('../../core-api');
const { BaseRegistry } = require('./base');

class ApiRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.apis = {};
  }
  get(name) {
    return this.apis[name];
  }
  getAll() {
    return this.apis;
  }
  add(apiName, apiConfig) {
    if (has(apiName, this.apis)) {
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

    this.apis[apiName] = apiInstance;

    return this.apis[apiName];
  }
}

const createApisRegistry = strapi => {
  return new ApiRegistry(strapi);
};

module.exports = createApisRegistry;
module.exports.ApiRegistry = ApiRegistry;
