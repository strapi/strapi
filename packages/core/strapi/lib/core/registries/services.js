'use strict';

const _ = require('lodash');
const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

const servicesRegistry = strapi => {
  const services = {};
  const instantiatedServices = {};

  return {
    get(uid) {
      if (instantiatedServices[uid]) {
        return instantiatedServices[uid];
      }

      const service = services[uid];
      if (service) {
        instantiatedServices[uid] = service({ strapi });
        return instantiatedServices[uid];
      }

      return undefined;
    },
    getAll(namespace) {
      const filteredServices = pickBy((_, uid) => hasNamespace(uid, namespace))(services);

      return _.mapValues(filteredServices, (service, serviceUID) => this.get(serviceUID));
    },
    set(uid, value) {
      instantiatedServices[uid] = value;
      return this;
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

      return this;
    },
    extend(serviceUID, extendFn) {
      const currentService = this.get(serviceUID);
      if (!currentService) {
        throw new Error(`Service ${serviceUID} doesn't exist`);
      }
      const newService = extendFn(currentService);
      instantiatedServices[serviceUID] = newService;
    },
  };
};

module.exports = servicesRegistry;
