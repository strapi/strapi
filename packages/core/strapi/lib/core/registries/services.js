'use strict';

const _ = require('lodash');
const { pickBy, has } = require('lodash/fp');
const { addNamespace } = require('../utils');

const contentTypesRegistry = strapi => {
  const services = {};
  const instanciatedServices = {};

  return {
    get(serviceUID) {
      if (instanciatedServices[serviceUID]) {
        return instanciatedServices[serviceUID];
      }

      const service = services[serviceUID];
      if (service) {
        instanciatedServices[serviceUID] = service({ strapi });
        return instanciatedServices[serviceUID];
      }

      return undefined;
    },
    getAll(prefix = '') {
      const filteredServices = pickBy((service, serviceUID) => serviceUID.startsWith(prefix))(
        services
      );
      return _.mapValues(filteredServices, (service, serviceUID) => this.get(serviceUID));
    },
    add(namespace, newServices) {
      for (const serviceName in newServices) {
        const service = newServices[serviceName];
        const uid = addNamespace(serviceName, namespace);

        if (has(uid, services)) {
          throw new Error(`Service ${uid} has already been registered.`);
        }
        services[uid] = service;
      }
    },
  };
};

module.exports = contentTypesRegistry;
