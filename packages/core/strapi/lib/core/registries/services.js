'use strict';

const _ = require('lodash');
const { pickBy, has } = require('lodash/fp');
const { addNamespace } = require('../utils');

const servicesRegistry = strapi => {
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
    extend(serviceUID, extendFn) {
      const currentService = this.get(serviceUID);
      if (!currentService) {
        throw new Error(`Service ${serviceUID} doesn't exist`);
      }
      const newService = extendFn(currentService);
      instanciatedServices[serviceUID] = newService;
    },
  };
};

module.exports = servicesRegistry;
