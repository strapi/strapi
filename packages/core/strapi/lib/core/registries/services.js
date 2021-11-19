'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @typedef {import('./services').Service} Service
 * @typedef {import('./services').ServiceFactory} ServiceFactory
 */

const servicesRegistry = strapi => {
  const services = {};
  const instantiatedServices = {};

  return {
    /**
     * Returns this list of registered services uids
     * @returns {string[]}
     */
    keys() {
      return Object.keys(services);
    },

    /**
     * Returns the instance of a service. Instantiate the service if not already done
     * @param {string} uid
     * @returns {Service}
     */
    get(uid) {
      if (instantiatedServices[uid]) {
        return instantiatedServices[uid];
      }

      const service = services[uid];
      if (service) {
        instantiatedServices[uid] = typeof service === 'function' ? service({ strapi }) : service;
        return instantiatedServices[uid];
      }
    },

    /**
     * Returns a map with all the services in a namespace
     * @param {string} namespace
     * @returns {{ [key: string]: Service }}
     */
    getAll(namespace) {
      const filteredServices = pickBy((_, uid) => hasNamespace(uid, namespace))(services);

      // create lazy accessor to avoid instantiating the services;
      const map = {};
      for (const uid in filteredServices) {
        Object.defineProperty(map, uid, {
          enumerable: true,
          get: () => {
            return this.get(uid);
          },
        });
      }

      return map;
    },

    /**
     * Registers a service
     * @param {string} uid
     * @param {Service} service
     */
    set(uid, service) {
      services[uid] = service;
      delete instantiatedServices[uid];
      return this;
    },

    /**
     * Registers a map of services for a specific namespace
     * @param {string} namespace
     * @param {{ [key: string]: Service|ServiceFactory }} newServices
     * @returns
     */
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

    /**
     * Wraps a service to extend it
     * @param {string} uid
     * @param {(service: Service) => Service} extendFn
     */
    extend(uid, extendFn) {
      const currentService = this.get(uid);

      if (!currentService) {
        throw new Error(`Service ${uid} doesn't exist`);
      }

      const newService = extendFn(currentService);
      instantiatedServices[uid] = newService;

      return this;
    },
  };
};

module.exports = servicesRegistry;
