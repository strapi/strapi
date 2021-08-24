'use strict';

const _ = require('lodash');
const { pickBy, has } = require('lodash/fp');

const contentTypesRegistry = strapi => {
  const services = {};
  const instantiatedServices = {};

  return {
    get(serviceUID) {
      if (instantiatedServices[serviceUID]) {
        return instantiatedServices[serviceUID];
      }

      const service = services[serviceUID];
      if (service) {
        instantiatedServices[serviceUID] = service({ strapi });
        return instantiatedServices[serviceUID];
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
        const uid = `${namespace}.${serviceName}`;
        if (has(uid, services)) {
          throw new Error(`Service ${uid} has already been registered.`);
        }
        services[uid] = service;
      }
    },
  };
};

module.exports = contentTypesRegistry;
