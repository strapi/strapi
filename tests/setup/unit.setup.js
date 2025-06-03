'use strict';

const _ = require('lodash');

// TODO: remove this tmp fix and migrate tests
let strapiInstance;
Object.defineProperty(global, 'strapi', {
  get() {
    return strapiInstance;
  },
  set(value) {
    strapiInstance = value;

    strapiInstance.plugin = (name) => strapiInstance.plugins[name];
    _.mapValues(strapi.plugins, (acc) => {
      acc.controller = (name) => acc.controllers[name];
      acc.service = (name) => acc.services[name];
      acc.contentType = (name) => acc.contentTypes[name];
      acc.policy = (name) => acc.policies[name];
    });

    strapiInstance.api = (name) => strapiInstance.apis[name];
    _.mapValues(strapi.api, (acc) => {
      acc.controller = (name) => acc.controllers[name];
      acc.service = (name) => acc.services[name];
      acc.contentType = (name) => acc.contentTypes[name];
      acc.policy = (name) => acc.policies[name];
    });

    strapiInstance.service = (name = '') => {
      if (name.startsWith('admin::')) {
        return strapiInstance.admin.services[name.split('admin::')[1]];
      }
    };
  },
});
