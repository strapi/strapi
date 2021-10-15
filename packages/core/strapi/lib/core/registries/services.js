'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 * @typedef {import('@strapi/strapi').StrapiServices} StrapiServices
 * @typedef {import('./types/services').Service} Service
 * @typedef {import('./types/services').ServiceFactory} ServiceFactory
 */

const _ = require('lodash');
const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @param {Strapi} strapi
 */
const servicesRegistry = strapi => {
  /**
   * @type {Record<string, Service|ServiceFactory>}
   */
  const services = {};
  /**
   * @type {StrapiServices}
   */
  // @ts-ignore
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
     * @template {keyof StrapiServices} T
     * @param {T} uid
     * @returns {StrapiServices[T] | undefined}
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

      return undefined;
    },

    /**
     * Returns a map with all the services in a namespace
     * @param {string=} namespace
     * @returns {Record<string, Service | undefined>}
     */
    getAll(namespace) {
      const filteredServices = pickBy((_, uid) => hasNamespace(uid, namespace))(services);

      // @ts-ignore
      return _.mapValues(filteredServices, (service, serviceUID) => this.get(serviceUID));
    },

    /**
     * Registers a service
     * @template {keyof StrapiServices} T
     * @param {T} uid
     * @param {Service|ServiceFactory} service
     */
    set(uid, service) {
      services[uid] = service;
      return this;
    },

    /**
     * Registers a map of services for a specific namespace
     * @param {string} namespace
     * @param {Record<string, Service | ServiceFactory>} newServices
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
     * @template {keyof StrapiServices} T
     * @param {T} uid
     * @param {(service: Service) => Service} extendFn
     */
    extend(uid, extendFn) {
      const currentService = this.get(uid);

      if (!currentService) {
        throw new Error(`Service ${uid} doesn't exist`);
      }

      const newService = extendFn(currentService);

      // @ts-ignore
      instantiatedServices[uid] = newService;

      return this;
    },
  };
};

module.exports = servicesRegistry;
