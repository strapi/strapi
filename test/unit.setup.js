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
    _.mapValues(strapi.plugins, (plugin) => {
      plugin.controller = (name) => plugin.controllers[name];
      plugin.service = (name) => plugin.services[name];
      plugin.contentType = (name) => plugin.contentTypes[name];
      plugin.policy = (name) => plugin.policies[name];
    });

    strapiInstance.service = (name = '') => {
      if (name.startsWith('admin::')) {
        return strapiInstance.admin.services[name.split('admin::')[1]];
      }
    };
  },
});
