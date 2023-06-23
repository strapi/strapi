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

    strapiInstance.service = (name = '') => {
      if (name.startsWith('admin::')) {
        return strapiInstance.admin.services[name.split('admin::')[1]];
      }
    };
  },
});

// Mock the `strapi` package
jest.mock('@strapi/strapi', () => ({
  strapi: {
    ...jest.requireActual('@strapi/strapi').strapi,
    query: jest.fn(),
    store: jest.fn(),
    getModel: jest.fn(),
    controllers: {},
    controller(name) {
      return this.controllers[name];
    },
    services: {},
    service(name) {
      return this.services[name];
    },
    plugins: {},
    plugin(name) {
      return {
        services: this.plugins[name].services,
        service(serviceName) {
          return this.services[serviceName];
        },
      };
    },
    contentTypes: {},
    contentType(name) {
      return this.contentTypes[name];
    },
    policies: {},
    policy(name) {
      return this.policies[name];
    },
  },
}));
